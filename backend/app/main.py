"""RoadWatch API.

Privacy rules this service follows:
  * No accounts, no user table, no device ids.
  * A report is only: kind, lat, lng, timestamps and two counters.
  * The caller's position is never sent here. Clients ask for a coarse
    bounding box and work out "am I close?" on the device.
  * No access log (see Dockerfile). The rate limiter keeps IPs in RAM only
    and forgets them after a minute.
  * Reports expire after 10 minutes (30 at most, if people keep confirming)
    and expired rows are deleted every minute.
"""
import asyncio
import os
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field

DATABASE_URL = os.environ["DATABASE_URL"]
TTL_MINUTES = 10
MAX_LIFETIME_MINUTES = 30
GONE_VOTES_TO_REMOVE = 3
MAX_BOX_DEGREES = 1.0          # biggest area one request may ask for
POSTS_PER_MINUTE = 6

Kind = Literal["obstacle", "police", "accident", "hazard"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS reports (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind          text NOT NULL CHECK (kind IN ('obstacle','police','accident','hazard')),
    lat           double precision NOT NULL,
    lng           double precision NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz NOT NULL,
    confirmations integer NOT NULL DEFAULT 0,
    gone_votes    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS reports_expires_idx ON reports (expires_at);
CREATE INDEX IF NOT EXISTS reports_lat_lng_idx ON reports (lat, lng);
"""

COLUMNS = ("id, kind, lat, lng, confirmations, "
           "GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())))::int AS seconds_left")


class ReportIn(BaseModel):
    kind: Kind
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class ReportOut(BaseModel):
    id: UUID
    kind: Kind
    lat: float
    lng: float
    confirmations: int
    seconds_left: int


async def cleanup_loop(pool: asyncpg.Pool) -> None:
    while True:
        try:
            await pool.execute("DELETE FROM reports WHERE expires_at < now()")
        except Exception:
            pass  # try again next minute
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = None
    for _ in range(30):  # the database may still be starting
        try:
            pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
            break
        except (OSError, asyncpg.PostgresError):
            await asyncio.sleep(1)
    if pool is None:
        raise RuntimeError("Could not connect to the database")
    await pool.execute(SCHEMA)
    app.state.pool = pool
    task = asyncio.create_task(cleanup_loop(pool))
    try:
        yield
    finally:
        task.cancel()
        await pool.close()


app = FastAPI(title="RoadWatch", docs_url="/api/docs", openapi_url="/api/openapi.json", lifespan=lifespan)

# ---- tiny in-memory rate limit (never written to disk) -------------------
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request) -> None:
    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "?")
    now = time.monotonic()
    q = _hits[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= POSTS_PER_MINUTE:
        raise HTTPException(429, "Too many reports. Try again in a minute.")
    q.append(now)
    if len(_hits) > 5000:  # keep memory bounded
        for key in [k for k, v in _hits.items() if not v or now - v[-1] > 60]:
            _hits.pop(key, None)


def pool_of(request: Request) -> asyncpg.Pool:
    return request.app.state.pool


# ---- routes ----------------------------------------------------------------
@app.get("/api/health")
async def health(request: Request):
    await pool_of(request).fetchval("SELECT 1")
    return {"ok": True}


@app.get("/api/reports", response_model=list[ReportOut])
async def list_reports(
    request: Request,
    south: float = Query(ge=-90, le=90),
    west: float = Query(ge=-180, le=180),
    north: float = Query(ge=-90, le=90),
    east: float = Query(ge=-180, le=180),
):
    if north < south or east < west:
        raise HTTPException(400, "Invalid box")
    if north - south > MAX_BOX_DEGREES or east - west > MAX_BOX_DEGREES:
        raise HTTPException(400, "Area too large")
    rows = await pool_of(request).fetch(
        f"""SELECT {COLUMNS} FROM reports
            WHERE expires_at > now()
              AND lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4
            ORDER BY created_at DESC LIMIT 500""",
        south, north, west, east,
    )
    return [dict(r) for r in rows]


@app.post("/api/reports", response_model=ReportOut, status_code=201)
async def create_report(body: ReportIn, request: Request):
    rate_limit(request)
    lat, lng = round(body.lat, 4), round(body.lng, 4)  # ~11 m precision is plenty
    pool = pool_of(request)
    # Same kind within ~100 m and still active? Treat it as a confirmation.
    row = await pool.fetchrow(
        f"""UPDATE reports
            SET confirmations = confirmations + 1,
                expires_at = LEAST(now() + make_interval(mins => $4),
                                   created_at + make_interval(mins => $5))
            WHERE id = (
                SELECT id FROM reports
                WHERE kind = $1 AND expires_at > now()
                  AND abs(lat - $2) < 0.0009 AND abs(lng - $3) < 0.0014
                ORDER BY created_at DESC LIMIT 1)
            RETURNING {COLUMNS}""",
        body.kind, lat, lng, TTL_MINUTES, MAX_LIFETIME_MINUTES,
    )
    if row is None:
        row = await pool.fetchrow(
            f"""INSERT INTO reports (kind, lat, lng, expires_at)
                VALUES ($1, $2, $3, now() + make_interval(mins => $4))
                RETURNING {COLUMNS}""",
            body.kind, lat, lng, TTL_MINUTES,
        )
    return dict(row)


@app.post("/api/reports/{report_id}/confirm", response_model=ReportOut)
async def confirm_report(report_id: UUID, request: Request):
    rate_limit(request)
    row = await pool_of(request).fetchrow(
        f"""UPDATE reports
            SET confirmations = confirmations + 1,
                expires_at = LEAST(now() + make_interval(mins => $2),
                                   created_at + make_interval(mins => $3))
            WHERE id = $1 AND expires_at > now()
            RETURNING {COLUMNS}""",
        report_id, TTL_MINUTES, MAX_LIFETIME_MINUTES,
    )
    if row is None:
        raise HTTPException(404, "Report has expired")
    return dict(row)


@app.post("/api/reports/{report_id}/gone")
async def report_gone(report_id: UUID, request: Request):
    rate_limit(request)
    pool = pool_of(request)
    votes = await pool.fetchval(
        "UPDATE reports SET gone_votes = gone_votes + 1 WHERE id = $1 RETURNING gone_votes",
        report_id,
    )
    if votes is None:
        raise HTTPException(404, "Report has expired")
    if votes >= GONE_VOTES_TO_REMOVE:
        await pool.execute("DELETE FROM reports WHERE id = $1", report_id)
    return {"removed": votes >= GONE_VOTES_TO_REMOVE}

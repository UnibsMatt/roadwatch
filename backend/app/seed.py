"""Fill the database with simulated reports, for testing and demos.

Run it inside the backend container:

    docker compose exec backend python -m app.seed
    docker compose exec backend python -m app.seed --count 40 --radius-km 5
    docker compose exec backend python -m app.seed --clear       # remove reports in the area first

Reports land at random points within the radius (not snapped to roads), with a mix
of kinds, ages and confirmations, so the map shows pins at different stages of
their countdown. They expire and get cleaned up like any real report.
"""
import argparse
import asyncio
import math
import os
import random

import asyncpg

from .main import MAX_LIFETIME_MINUTES, SCHEMA, TTL_MINUTES

# Default centre: lat=45.858037, lon=10.168056
DEFAULT_LAT = 45.858037
DEFAULT_LNG = 10.168056
DEFAULT_RADIUS_KM = 10.0
DEFAULT_COUNT = 25

# Roughly how often each kind shows up in the simulation.
KIND_WEIGHTS = {"obstacle": 3, "police": 3, "hazard": 2, "accident": 1}

EARTH_RADIUS_M = 6_371_000


def random_point(lat: float, lng: float, radius_m: float) -> tuple[float, float]:
    """A random point spread evenly over a circle of `radius_m` around (lat, lng)."""
    dist = radius_m * math.sqrt(random.random())  # sqrt keeps the spread even, not bunched in the middle
    bearing = random.uniform(0, 2 * math.pi)
    d = dist / EARTH_RADIUS_M
    lat1, lng1 = math.radians(lat), math.radians(lng)
    lat2 = math.asin(math.sin(lat1) * math.cos(d) + math.cos(lat1) * math.sin(d) * math.cos(bearing))
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(d) * math.cos(lat1),
        math.cos(d) - math.sin(lat1) * math.sin(lat2),
    )
    return round(math.degrees(lat2), 4), round(math.degrees(lng2), 4)


def simulated_report(lat: float, lng: float, radius_m: float) -> tuple:
    """One fake report: (kind, lat, lng, age in s, seconds left, confirmations)."""
    kind = random.choices(list(KIND_WEIGHTS), weights=list(KIND_WEIGHTS.values()))[0]
    p_lat, p_lng = random_point(lat, lng, radius_m)
    confirmations = random.choices([0, 1, 2, 3, 5], weights=[50, 20, 15, 10, 5])[0]
    if confirmations:
        # confirmed reports are older, and were last confirmed a while after they were made
        age = random.uniform(TTL_MINUTES * 30, (MAX_LIFETIME_MINUTES - 2) * 60)
        since_confirm = random.uniform(0, TTL_MINUTES * 60 - 30)
        left = min(TTL_MINUTES * 60 - since_confirm, MAX_LIFETIME_MINUTES * 60 - age)
    else:
        age = random.uniform(0, TTL_MINUTES * 60 - 30)
        left = TTL_MINUTES * 60 - age
    return kind, p_lat, p_lng, int(age), max(30, int(left)), confirmations


def box(lat: float, lng: float, radius_m: float) -> tuple[float, float, float, float]:
    dlat = math.degrees(radius_m / EARTH_RADIUS_M)
    dlng = dlat / max(0.01, math.cos(math.radians(lat)))
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng


async def seed(
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
    radius_km: float = DEFAULT_RADIUS_KM,
    count: int = DEFAULT_COUNT,
    clear: bool = False,
    database_url: str | None = None,
) -> int:
    """Insert `count` simulated reports within `radius_km` of (lat, lng). Returns how many were added."""
    radius_m = radius_km * 1000
    conn = await asyncpg.connect(database_url or os.environ["DATABASE_URL"])
    try:
        await conn.execute(SCHEMA)
        if clear:
            south, north, west, east = box(lat, lng, radius_m)
            status = await conn.execute(
                "DELETE FROM reports WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4",
                south, north, west, east,
            )
            print(f"Cleared {status.split()[-1]} existing reports in the area.")
        rows = [simulated_report(lat, lng, radius_m) for _ in range(count)]
        await conn.executemany(
            """INSERT INTO reports (kind, lat, lng, created_at, expires_at, confirmations)
               VALUES ($1, $2, $3,
                       now() - make_interval(secs => $4),
                       now() + make_interval(secs => $5),
                       $6)""",
            rows,
        )
    finally:
        await conn.close()

    by_kind = {k: sum(1 for r in rows if r[0] == k) for k in KIND_WEIGHTS}
    summary = ", ".join(f"{n} {k}" for k, n in by_kind.items() if n)
    print(f"Added {count} reports within {radius_km:g} km of {lat}, {lng}: {summary}.")
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Add simulated RoadWatch reports around a position.")
    parser.add_argument("--lat", type=float, default=DEFAULT_LAT)
    parser.add_argument("--lng", "--lon", type=float, default=DEFAULT_LNG)
    parser.add_argument("--radius-km", type=float, default=DEFAULT_RADIUS_KM)
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT)
    parser.add_argument("--clear", action="store_true", help="delete reports in the area before adding new ones")
    parser.add_argument("--random-seed", type=int, help="repeat the exact same layout")
    args = parser.parse_args()
    if args.random_seed is not None:
        random.seed(args.random_seed)
    asyncio.run(seed(args.lat, args.lng, args.radius_km, args.count, args.clear))


if __name__ == "__main__":
    main()

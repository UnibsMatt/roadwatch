# RoadWatch

Drivers tap a button to mark an obstacle, police, an accident or a hazard on the map.
Everyone nearby sees it for 20 minutes, and phones warn you when you get close to one.

- **Backend:** FastAPI (Python 3.13) + asyncpg
- **Database:** PostgreSQL 18
- **Frontend:** React, Vite, Tailwind CSS 4, MapLibre GL with OpenStreetMap tiles
- **Run:** Docker Compose, one command

## Run it

```bash
cp .env.example .env      # then edit the password
docker compose up --build
```

Open http://localhost:8080.

### Trying it on a phone

Browsers only give websites GPS access on **https** (or `localhost`). So to test on a phone you need a
secure address. Easiest options:

- Put it behind a reverse proxy with a certificate (Caddy, Traefik, Cloudflare Tunnel, Tailscale Serve).
- Or run `tailscale serve` / `cloudflared tunnel --url http://localhost:8080` for a temporary https link.

## How it handles privacy

- No accounts, no user table, no device ids, no cookies.
- Your position is read on the phone and **never sent to the server**. The app asks for reports in a
  coarse grid (about 33 x 33 km) and works out "am I close to one?" on the device.
- The only thing stored is a report: type, place (rounded to ~11 m), timestamps and two counters.
- Reports are deleted when they expire (20 minutes, 60 at most if drivers keep confirming them).
- No access logs (uvicorn `--no-access-log`, nginx `access_log off`). The rate limiter keeps IP addresses
  in memory only and forgets them after a minute.
- Settings (distance, theme, sound) are saved in the browser only.

## Alerts: what works and what doesn't

When you come within your chosen distance (200 m, 500 m or 1 km) of a report you get an on-screen banner,
a beep and a vibration, plus a system notification if the app is in the background.

A website cannot track your location while the screen is off. For alerts to work while driving, keep
RoadWatch open on screen ("Keep the screen on" in settings). True background alerts would need a native
app. Notifications on iPhone need the site to be added to the Home Screen first.

## Layout

```
backend/    FastAPI app, creates its own table on start
frontend/   React app, built and served by nginx (which also proxies /api)
docker-compose.yml
```

API (docs at `/api/docs`):

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/reports?south&west&north&east` | Active reports in a box (max 1 degree wide) |
| POST | `/api/reports` | `{kind, lat, lng}`. A same-type report within ~100 m counts as a confirmation |
| POST | `/api/reports/{id}/confirm` | "Still there": extends to 20 minutes from now |
| POST | `/api/reports/{id}/gone` | "It's gone": removed after 3 votes |

## Notes

- **Versions:** `frontend/package.json` uses `latest` for every package so you get current versions.
  After the first `npm install`, commit the generated `package-lock.json` to pin them. Pin the Python
  packages in `backend/requirements.txt` the same way (`pip freeze`).
- **Tiles:** the public OpenStreetMap tile server is fine for a small group. For heavier use follow the
  [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and set `TILE_URL` to your own
  or a commercial tile provider.
- **Abuse:** there are no accounts, so anyone can post a fake report. The app limits each IP to 6 posts a
  minute and merges duplicates. For a public launch, add a CAPTCHA or proof-of-work on `POST /api/reports`.
- **Development without Docker:** run Postgres, then
  `DATABASE_URL=postgresql://... uvicorn app.main:app --reload` in `backend/` and `npm install && npm run dev`
  in `frontend/` (Vite proxies `/api` to port 8000).

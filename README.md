# Pulse Analytics

A lightweight, self-hostable web analytics platform. Drop one script tag on any website and get a real-time dashboard showing page views, click events, and user interactions.

Built with Node.js, Express, SQLite, Supabase auth, and vanilla JS. Deployed on Railway.

## Tech Stack

- **Backend** — Node.js, Express
- **Database** — SQLite via sql.js (pure JS, zero native compilation)
- **Auth** — Supabase (JWT-based, email/password)
- **Frontend** — Vanilla JS, Chart.js, CSS custom properties
- **Deployment** — Railway (Dockerized)

## How it works

**Event ingestion** — a JS snippet auto-tracks page views, button clicks, and input focus. Events POST to `/e` which responds 200 immediately to avoid blocking the user's page load.

**Auth** — Supabase handles signup/login and issues JWTs. The backend verifies tokens using the Supabase service role key. `/e` is public so the tracking script works without a session.

**Storage** — events stored in SQLite, indexed on `project_id` and `ts`. Dashboard polls every 5 seconds. Aggregations (top pages, hourly volume) computed in SQL at query time.

**Frontend** — SPA with no framework. Routing via CSS `display` toggling. Auth state via Supabase `onAuthStateChange`.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/e` | None | Ingest an event |
| `POST` | `/api/projects` | Required | Create a project |
| `GET` | `/api/projects` | Required | List your projects |
| `GET` | `/api/events/:id?range=24h` | Required | Events + stats |

## Running locally
```bash
git clone https://github.com/minhtruongg/pulse-app
cd pulse-app/backend && npm install
cp .env.example .env  # fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
npm start             # http://localhost:3001
```

## Design decisions

**sql.js over better-sqlite3** — avoids node-gyp native compilation, works on Windows without Visual Studio.

**No frontend framework** — UI is simple enough that Vanilla JS is cleaner and keeps the bundle tiny.

**Polling over WebSockets** — 5s polling is simpler infrastructure with acceptable latency for analytics.

**Server-side click filtering** — junk clicks filtered in the backend so all users benefit without updating their script.

## License

MIT

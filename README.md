# AfyaLink

An offline-first community health reporting app for rural Kenya. Community Health Volunteers record reports on a phone; they sync to a central database when connectivity returns. Administrators get dashboards and disease maps.

> Academic prototype. Not connected to any national health system. All data is synthetic.

## What's in the repo

- `frontend/` — Next.js 16 app (the phone interface)
- `backend/` — NestJS REST API under `/api`
- `docs/` — architecture, API, database schema

## Quick start

```bash
npm install          # installs frontend + backend
npm run db:migrate   # create the database and apply the schema
npm run db:seed      # load synthetic demo data
npm run dev          # start both apps
```

| What | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |

Both apps start without a database — data endpoints return 503 instead of crashing, and reports queue in the browser until the server is back.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start both apps |
| `npm run build` | Build both for production |
| `npm run start` | Run the production builds |
| `npm run lint` | Lint both apps |
| `npm run typecheck` | Type-check both apps |
| `npm run test` | Run all tests |
| `npm run db:migrate` / `db:seed` / `db:status` | Database migrations and seed data |

## Environment

Create a `.env` in the repo root (it is gitignored). See `.env.example` for the full list. The important ones:

- `DATABASE_URL` (or `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) — MySQL connection
- `SESSION_SECRET` — 32+ characters, required in production
- `NEXT_PUBLIC_API_URL` — default `http://localhost:3001/api`

The frontend only copies `NEXT_PUBLIC_*` keys from the root `.env`, so server secrets never reach the browser.

## Documentation

- [docs/architecture.md](docs/architecture.md) — how the pieces fit together
- [docs/api.md](docs/api.md) — endpoints, auth, errors
- [docs/database-schema.md](docs/database-schema.md) — tables and indexes

## Known limitations

- IndexedDB data is not encrypted on the device.
- Lockout counters live in memory (reset on restart). Use Redis if you run several instances.
- Needs HTTPS, a least-privilege database user, and backups before any real deployment.
# AfyaLink — Claude Code Project Instructions

## 1. Project identity

**Project name:** AfyaLink  
**Official title:** Design and Development of AfyaLink: An Offline-First Community Health Reporting System for Rural Kenya.  
**Catchline:** From Community Reports to Faster Health Action.

AfyaLink is a mobile-first web application intended to help Community Health Volunteers (CHVs) in rural Kenya record community health reports, retain reports while offline, synchronize them when connectivity returns, and provide authorized health administrators with reporting dashboards and disease maps.

Build a practical academic-project prototype. Do not claim integration with Kenya's national health infrastructure or production readiness unless it is actually implemented and verified.

## 2. Non-negotiable architecture

The repository must have **two separate application folders only**:

- `frontend/` — Next.js frontend.
- `backend/` — NestJS backend.

Do **not** use an `apps/` directory. Do not place one application inside the other.

Use this root layout:

```text
afyalink/
├── frontend/                  # Next.js App Router + React + TypeScript
├── backend/                   # NestJS + TypeScript
├── database/
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api.md
│   └── development-plan.md
├── package.json               # Root scripts to run both apps
├── .env.example
├── .gitignore
├── .editorconfig
└── README.md
```

Follow current framework conventions inside each application. Keep shared documentation, database artifacts, and root scripts outside the two applications.

## 3. Technology choices

### Frontend (`frontend/`)

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Lucide React icons
- React Hook Form and Zod for forms and validation
- Recharts for charts
- Leaflet / React Leaflet for maps
- Dexie.js over IndexedDB for local offline report storage
- A PWA setup compatible with the selected Next.js version

Use reusable components, typed interfaces, clear loading/error/empty states, and responsive mobile-first layouts.

### Backend (`backend/`)

- NestJS and TypeScript
- REST API with global `/api` prefix
- MySQL as the central database
- Choose one ORM/database integration (preferably Prisma or TypeORM) and use it consistently
- `@nestjs/config` for environment configuration
- DTO validation using `class-validator` and `class-transformer`
- Password hashing and role-based authorization
- Automated backend tests

Do not introduce Firebase as a second database. MySQL is the central server-side source of truth. IndexedDB is only the browser's local offline store.

## 4. One-command development

From the repository root, the developer must be able to run:

```bash
npm install
npm run dev
```

`npm run dev` must launch both processes concurrently and stop both when interrupted.

Required local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

Configure the root `package.json` to orchestrate the apps using `concurrently`, with scripts equivalent to:

```json
{
  "private": true,
  "scripts": {
    "dev": "concurrently -k -n FRONTEND,BACKEND -c blue,green \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "npm --prefix frontend run dev",
    "dev:backend": "npm --prefix backend run start:dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "npm --prefix frontend run build",
    "build:backend": "npm --prefix backend run build",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "npm --prefix frontend run lint",
    "lint:backend": "npm --prefix backend run lint",
    "test": "npm run test:backend",
    "test:backend": "npm --prefix backend run test",
    "typecheck": "npm run typecheck:frontend && npm run typecheck:backend",
    "typecheck:frontend": "npm --prefix frontend run typecheck",
    "typecheck:backend": "npm --prefix backend run typecheck"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

Adapt the scripts to actual generated package files and installed tool versions. Every root script must point to a real script. Add `typecheck` scripts to both applications. Keep frontend and backend dependencies in their respective `package.json` files; install `concurrently` at the root.

Create `.env.example` with at least:

```dotenv
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Backend
PORT=3001
NODE_ENV=development
DATABASE_URL=
SESSION_SECRET=
FRONTEND_ORIGIN=http://localhost:3000
```

Use each framework's correct environment-loading behavior. Never commit real `.env` files or credentials. Do not expose server-only secrets through `NEXT_PUBLIC_` variables.

## 5. Backend modules and API

Organize NestJS into maintainable modules, including:

- `AuthModule`
- `UsersModule`
- `ReportsModule`
- `AnalyticsModule`
- `SyncModule`
- `DatabaseModule`
- shared validation, exception handling, and authorization utilities

Implement a working `GET /api/health` endpoint that reports application status without exposing secrets.

Plan and implement these endpoints, clearly documenting any that remain incomplete:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/:id`
- `GET /api/analytics/summary`
- `POST /api/sync`

Use DTO validation, consistent error responses, and pagination for list endpoints. Protect private endpoints and enforce `CHV` and `ADMIN` permissions on the server. Do not rely on frontend-only access control.

For browser authentication, use an appropriately secured HTTP-only cookie/session approach and document CSRF protections. Hash passwords securely. Never put passwords, session secrets, or long-lived authentication tokens in local storage.

## 6. Database foundation

Create migrations or schema definitions for:

- `users`
- `health_reports`
- `locations`
- `sync_logs`

Include appropriate primary/foreign keys, timestamps, indexes, status fields, and constraints. Health reports should have a stable client-generated identifier or idempotency key so retries cannot create duplicate records.

Use synthetic seed data only. Do not use real patient or identifiable community-health data in development fixtures.

Document database setup and migrations in `README.md` and `docs/database-schema.md`.

The app should start in development even if the database is not configured, where practical. If database connectivity is required for a feature, return a clear error and document the requirement rather than pretending the feature works.

## 7. Frontend pages and design

Build a polished, accessible, mobile-first healthcare interface with consistent typography, spacing, navigation, and feedback.

Create these routes:

- `/` — public landing page
- `/login` — sign-in page
- `/dashboard` — CHV dashboard
- `/reports` — report list
- `/reports/new` — report creation form
- `/sync` — offline queue and synchronization status
- `/maps` — disease-report map
- `/admin` — administrator dashboard

Include responsive navigation, accessible form labels, validation messages, loading states, error states, and useful empty states. Do not use decorative controls that do nothing; either implement their behavior or clearly mark them as placeholders.

Use mock dashboard data only when needed for the scaffold and label it as demo data. Do not imply mock data is live data from the API. Centralize API configuration and use typed API services.

## 8. Offline-first reporting

The key demonstration workflow is:

1. A CHV opens AfyaLink and starts a report.
2. The report is saved in IndexedDB even when the browser is offline.
3. The report remains available after a reload.
4. The app tracks it as pending synchronization.
5. When connectivity returns, the app attempts to upload it.
6. The backend validates the report and persists it in MySQL.
7. The client marks it synced only after receiving a successful server response.
8. Retrying the same report does not create a duplicate.

Create typed report/sync models and explicit states such as `pending`, `syncing`, `synced`, and `failed`. Trigger sync attempts on startup, when the browser returns online, and when the app becomes active. Do not rely exclusively on Background Sync support.

Set up PWA foundations and test the offline user experience. Do not indiscriminately cache authenticated API responses or sensitive health information in the service worker. Explain browser storage limitations and production HTTPS requirements.

If the full sync flow is not completed during the scaffold, implement the local persistence and service boundaries first, document what remains, and never claim that synchronization is fully working until tested end to end.

## 9. Privacy and security

- Validate every incoming request.
- Enforce authorization on the backend.
- Hash passwords securely.
- Restrict CORS to the configured frontend origin.
- Keep database credentials and secrets on the server.
- Avoid logging identifiable or sensitive health information.
- Use synthetic data for development.
- Avoid indiscriminate browser caching of private data.
- Document the need for HTTPS, secure cookies, backups, and access controls in production.
- Do not implement AI prediction, SMS gateway integration, or national health-system integration in this initial scope unless explicitly requested later.

## 10. Quality, testing, and maintainability

- Use strict TypeScript where practical.
- Keep modules and components focused.
- Avoid unnecessary dependencies and duplicated logic.
- Provide meaningful error handling.
- Add tests for health checks, report validation, authorization, and idempotent sync behavior as features are implemented.
- Ensure lint, type-check, build, and test commands are valid.
- Do not silence TypeScript errors or tests merely to make the build appear successful.
- Do not fabricate test results.

## 11. How Claude Code must work

1. Inspect the current directory and existing files before making changes.
2. Preserve unrelated work; do not overwrite existing files without inspecting them.
3. Create and edit actual files in the workspace; do not respond with a tutorial instead of implementation.
4. Keep the two applications in `frontend/` and `backend/`.
5. Install dependencies if permitted and feasible.
6. Run `npm run dev`, and run build, lint, type-check, and tests where available.
7. Fix errors caused by your changes.
8. Verify the frontend loads and `GET /api/health` responds.
9. If a command cannot run because of environment limitations, report the exact limitation rather than claiming success.
10. Keep the README aligned with the actual files, scripts, environment variables, and implemented features.

## 12. Definition of done

The scaffold is complete when:

- `frontend/` contains the Next.js app.
- `backend/` contains the NestJS app.
- No `apps/` directory has been introduced.
- Running `npm install` and then `npm run dev` from the root starts both apps.
- The frontend is available at port 3000.
- The backend health endpoint is available at port 3001 under `/api/health`.
- The MySQL schema/migration foundation exists.
- IndexedDB offline storage has an implementation foundation.
- Environment examples and setup documentation are present.
- Build/type-check/test outcomes are reported honestly.

At the end, give a concise summary of created files, commands to run, URLs, verified checks, and unfinished work.

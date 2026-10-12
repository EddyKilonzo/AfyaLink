# How AfyaLink works

An illustrated walkthrough of the offline-first loop: a report starts on a phone,
waits through a dropped connection, and lands on the server — confirmed, not assumed.

## The loop in four steps

### 1. Capture

A community health volunteer opens the report form and records what they saw in
under a minute: category, condition, severity, number of cases, age group, when
and where they observed it, and optional symptoms and notes.

The moment they tap **Save report**, the record is written to the device's own
IndexedDB store. No network request is made. Nothing is shown as "sent".

### 2. Save offline

The report enters the queue as `pending`. It stays there even if the app is
closed, the phone is restarted, or the connection disappears. A draft of an
unfinished report is kept on the device too, so work is never lost.

While offline, the app shows an honest state: *Offline, N saved* — and a banner
along the top of every screen says the same thing.

### 3. Synchronize

When the connection returns, the sync engine wakes up and uploads reports in
batches of 25. Each report is marked `syncing` while in flight, and only flips to
`synced` when the server answers `created` or `duplicate`.

Retries use exponential back-off (15 s → 30 min), so a weak signal is never
drained. A report the server rejected (for example, a location outside the
volunteer's county) becomes `failed` with the reason shown, and is not retried
automatically — the volunteer must fix it.

The server is idempotent on the client-generated report ID, so a retry can never
create a duplicate row.

### 4. Review

Administrators see each report arrive on the overview dashboard and the review
queue. They mark it `reviewed` or `actioned` — the workflow only moves forward.
Every action is recorded in the audit log.

Volunteers can correct their own report while it is still `submitted` and less
than 72 hours old.

## What is cached where

| Data | Lives in | Cleared when |
| --- | --- | --- |
| Reports waiting to sync | IndexedDB (Dexie) on the device | Manually discarded, or on sign-out for already-synced ones |
| Confirmed reports | MySQL on the server | Never, by the app |
| App shell (pages, scripts, icons) | Service worker cache | On a new deploy (cache version bumps) |
| API responses | Never cached | — |
| Map tiles | Not cached (OpenStreetMap) | — |

The service worker caches only same-origin app-shell resources. It never touches
the API (which runs on its own origin), `/api/` paths, or cross-origin requests.
Health data stays in IndexedDB under the app's own control.

## Persistent storage

On app load, the app asks the browser to keep IndexedDB around via
`navigator.storage.persist()`. Browsers may evict storage under pressure; this is
the only signal that asks them not to. It is best effort and silently ignored
where unsupported.

## Connectivity

The app reads `navigator.onLine` for the UI, but treats a failed request as
offline too. A report is only marked sent once the server confirms it, so a
flaky connection can never leave the device believing a report was delivered.

## Illustrated demo

The landing page runs a self-playing demo (`HeroPreview`) of the same loop: a
volunteer's phone saves a report while offline, sends it to the server when the
connection returns, and it appears on the administrator dashboard. The
interactive `OfflineDemo` section lets you try it yourself — record a few reports
while offline, then switch the connection on and watch them go, one at a time,
each confirmed before it leaves the queue.

## Related

- [Architecture](architecture.md) — module layout, request pipeline, data flow
- [API reference](api.md) — endpoints, auth, CSRF, errors, rate limits
- [Database schema](database-schema.md) — tables, enums, indexes
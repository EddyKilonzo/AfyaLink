/** Base URL of the NestJS API, including the /api prefix.
 *  On Vercel, leave NEXT_PUBLIC_API_URL unset to use same-origin relative paths
 *  (the vercel.json rewrite routes /api/* to the backend service). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/+$/, "");

/** Max reports per POST /api/sync request; must not exceed the backend's MAX_SYNC_BATCH. */
export const SYNC_BATCH_SIZE = 25;

/** Background retry interval while the app is open and reports are pending. */
export const SYNC_INTERVAL_MS = 60_000;

// Real IndexedDB semantics in Node, so Dexie and the sync engine run unmodified.
import "fake-indexeddb/auto";

// Node's global `navigator` has no `onLine`; the sync engine treats that as offline.
Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true, writable: true });

// The API base defaults to same-origin "/api" (Vercel rewrite). Tests point at the
// standalone NestJS server on :3001 so the fetch mock and sync engine can reach it.
process.env.NEXT_PUBLIC_API_URL ??= "http://localhost:3001/api";
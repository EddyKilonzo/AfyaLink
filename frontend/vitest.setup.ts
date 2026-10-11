// Real IndexedDB semantics in Node, so Dexie and the sync engine run unmodified.
import "fake-indexeddb/auto";

// Node's global `navigator` has no `onLine`; the sync engine treats that as offline.
Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true, writable: true });
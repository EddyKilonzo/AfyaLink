import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors the "@/*" path in tsconfig.json.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Dexie keeps a connection open per database; without this the worker holds
    // the event loop alive and vitest reports "child process exceptions,
    // exceeding retry limit". Each DB-using file closes its connection in its own
    // afterAll so the suite can exit cleanly.
    isolate: true,
    pool: "threads",
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
  },
});
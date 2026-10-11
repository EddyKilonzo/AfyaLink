#!/usr/bin/env node
/**
 * Runs the HTTP test suite (backend/test/http/*.http) against a real API and MySQL.
 *
 *   npm run test:http          (run `npm run build` first, or use `npm run test:http:build`)
 *
 * Steps:
 *   1. Drops and recreates a dedicated test database (HTTP_TEST_DB_NAME, default
 *      `<DB_NAME>_http_test`). The name must end in `_test`, so a development or
 *      production database can never be dropped by this script.
 *   2. Applies migrations and the synthetic seed to it.
 *   3. Starts the built API (dist/main.js) on HTTP_TEST_PORT (default 3101) with
 *      rate limiting disabled, since the suite sends far more requests per minute
 *      than the limits allow (they are covered by unit and e2e tests instead).
 *   4. Runs every .http file with httpyac, in filename order, then stops the API.
 *
 * Reads DB_* (or DATABASE_URL) from the environment, backend/.env or the root .env.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');
const rootDir = path.resolve(backendDir, '..');
const httpDir = path.join(backendDir, 'test', 'http');

async function loadEnv() {
  for (const file of [path.join(backendDir, '.env'), path.join(rootDir, '.env')]) {
    if (!existsSync(file)) continue;
    const parsed = parseEnv(await readFile(file, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/** Resolves connection settings and points them at the test database. */
function testDbSettings() {
  const env = process.env;
  let settings;
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    settings = {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    };
  } else {
    settings = {
      host: env.DB_HOST,
      port: Number(env.DB_PORT ?? 3306),
      user: env.DB_USER,
      password: env.DB_PASSWORD ?? '',
      database: env.DB_NAME ?? 'afyalink',
    };
  }
  if (!settings.host || !settings.user) throw new Error('DB_HOST and DB_USER (or DATABASE_URL) must be set.');

  const database = env.HTTP_TEST_DB_NAME || `${settings.database}_http_test`;
  if (!/^[A-Za-z0-9_]+_test$/.test(database)) {
    throw new Error(`Refusing to use "${database}": the HTTP test database name must end in _test.`);
  }
  return { ...settings, database };
}

async function recreateDatabase(settings) {
  const conn = await mysql.createConnection({ ...settings, database: undefined });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${settings.database}\``);
    await conn.query(
      `CREATE DATABASE \`${settings.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await conn.end();
  }
}

function run(command, args, env, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: backendDir, env, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function waitForApi(baseUrl, server, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`API exited early with code ${server.exitCode}.`);
    try {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      if (body.database === 'connected') return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('API did not report a connected database in time.');
}

async function main() {
  await loadEnv();
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run HTTP tests with NODE_ENV=production.');

  const entry = path.join(backendDir, 'dist', 'main.js');
  if (!existsSync(entry)) throw new Error('dist/main.js not found. Run `npm run build` first.');

  const db = testDbSettings();
  const port = process.env.HTTP_TEST_PORT ?? '3101';
  const baseUrl = `http://localhost:${port}/api`;
  const childEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    DATABASE_URL: '',
    DB_HOST: db.host,
    DB_PORT: String(db.port),
    DB_USER: db.user,
    DB_PASSWORD: db.password,
    DB_NAME: db.database,
    CORS_ORIGINS: 'http://localhost:3000',
    COOKIE_SECURE: 'false',
    RATE_LIMIT_DISABLED: 'true',
    SESSION_SECRET: randomBytes(48).toString('hex'),
  };

  console.log(`HTTP tests: database ${db.database} @ ${db.host}:${db.port}, API ${baseUrl}`);
  await recreateDatabase(db);
  for (const step of ['migrate', 'seed']) {
    const code = await run(process.execPath, ['scripts/db.mjs', step], childEnv);
    if (code !== 0) throw new Error(`db ${step} failed.`);
  }

  const server = spawn(process.execPath, [entry], { cwd: backendDir, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  const capture = (chunk) => {
    serverLog = (serverLog + chunk.toString()).slice(-20_000);
  };
  server.stdout.on('data', capture);
  server.stderr.on('data', capture);

  let exitCode = 1;
  try {
    await waitForApi(baseUrl, server);
    const files = (await readdir(httpDir)).filter((f) => f.endsWith('.http')).sort();
    if (files.length === 0) throw new Error('No .http files found in test/http.');

    const httpyac = path.join(backendDir, 'node_modules', 'httpyac', 'bin', 'httpyac.js');
    exitCode = 0;
    for (const file of files) {
      console.log(`\n=== ${file}`);
      const code = await run(
        process.execPath,
        [httpyac, 'send', path.join('test', 'http', file), '--all', '--bail', '--env', 'test', '--var', `baseUrl=${baseUrl}`, '-o', 'none', '--output-failed', 'exchange'],
        childEnv,
      );
      if (code !== 0) exitCode = code;
    }
  } catch (error) {
    console.error(`\nhttp-test: ${error.message}`);
    console.error('--- last API output ---\n' + serverLog);
  } finally {
    server.kill();
  }
  if (exitCode !== 0) console.error('\nHTTP tests FAILED.');
  else console.log('\nHTTP tests passed.');
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`http-test: ${error.message}`);
  process.exitCode = 1;
});

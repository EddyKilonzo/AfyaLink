#!/usr/bin/env node
/**
 * Minimal SQL migration/seed runner for AfyaLink.
 *
 *   node scripts/db.mjs migrate   apply backend/database/migrations/*.sql
 *   node scripts/db.mjs seed      apply backend/database/seeds/*.sql (synthetic data, dev only)
 *   node scripts/db.mjs status    list applied migrations
 *
 * Applied files are recorded in `schema_migrations`, so each runs once.
 * Reads DB_* settings from backend/.env or the root .env.
 * Supports both MySQL and PostgreSQL (via DB_DIALECT).
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import pg from 'pg';
import mysql from 'mysql2/promise';

const { Pool: PgPool } = pg;
const { Pool: MySqlPool } = mysql;

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');
const rootDir = path.resolve(backendDir, '..');
const databaseDir = path.join(backendDir, 'database');

async function loadEnv() {
  for (const file of [path.join(backendDir, '.env'), path.join(rootDir, '.env')]) {
    if (!existsSync(file)) continue;
    try {
      const parsed = parseEnv(await readFile(file, 'utf8'));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    } catch (error) {
      throw new Error(`Could not read ${path.relative(rootDir, file)}: ${error.message}`);
    }
  }
}

function dbSettings() {
  const dialect = (process.env.DB_DIALECT ?? 'mysql').toLowerCase();
  
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      process.env.DB_HOST = url.hostname;
      process.env.DB_PORT = url.port || (dialect === 'postgres' ? '5432' : '3306');
      process.env.DB_USER = decodeURIComponent(url.username);
      process.env.DB_PASSWORD = decodeURIComponent(url.password);
      process.env.DB_NAME = decodeURIComponent(url.pathname.replace(/^\//, ''));
      process.env.DB_DIALECT = dialect;
    } catch {
      throw new Error(`DATABASE_URL is not a valid ${dialect === 'postgres' ? 'postgresql://' : 'mysql://'} URL.`);
    }
  }
  
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_DIALECT: envDialect } = process.env;
  const finalDialect = (envDialect ?? dialect).toLowerCase();
  
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('DB_HOST, DB_USER and DB_NAME must be set (see .env.example).');
  }
  
  const defaultPort = finalDialect === 'postgres' ? 5432 : 3306;
  
  return {
    dialect: finalDialect,
    host: DB_HOST,
    port: Number(DB_PORT ?? defaultPort),
    user: DB_USER,
    password: DB_PASSWORD ?? '',
    database: DB_NAME,
  };
}

/** Postgres TLS, matching resolveDbSsl() in src/config/configuration.ts. */
function pgSsl(host) {
  const explicit = process.env.DB_SSL?.trim().toLowerCase();
  let mode = explicit || null;
  if (!mode && process.env.DATABASE_URL) {
    try {
      mode = new URL(process.env.DATABASE_URL).searchParams.get('sslmode');
    } catch {
      // Reported by dbSettings().
    }
  }
  if (mode === 'off' || mode === 'false' || mode === 'disable') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode) return { rejectUnauthorized: true };
  return ['localhost', '127.0.0.1', '::1'].includes(host) ? false : { rejectUnauthorized: true };
}

async function sqlFiles(folder) {
  try {
    const entries = await readdir(path.join(databaseDir, folder));
    return entries.filter((f) => f.endsWith('.sql')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function createPool(settings) {
  if (settings.dialect === 'postgres') {
    return new PgPool({
      host: settings.host,
      port: settings.port,
      user: settings.user,
      password: settings.password,
      database: settings.database,
      ssl: pgSsl(settings.host),
      max: 1,
    });
  } else {
    return new MySqlPool({
      host: settings.host,
      port: settings.port,
      user: settings.user,
      password: settings.password,
      database: settings.database,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      multipleStatements: true,
    });
  }
}

async function ensureLedger(pool, dialect) {
  if (dialect === 'postgres') {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('migration','seed')),
        applied_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);
  } else {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        kind ENUM('migration','seed') NOT NULL,
        applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
}

async function apply(pool, dialect, kind) {
  const folder = kind === 'migration' ? 'migrations' : 'seeds';
  let applied;
  
  if (dialect === 'postgres') {
    const { rows } = await pool.query('SELECT name FROM schema_migrations WHERE kind = $1', [kind]);
    applied = new Set(rows.map((r) => r.name));
  } else {
    const [rows] = await pool.query('SELECT name FROM schema_migrations WHERE kind = ?', [kind]);
    applied = new Set(rows.map((r) => r.name));
  }
  
  const files = await sqlFiles(folder);
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(databaseDir, folder, file), 'utf8');
    try {
      await pool.query(sql);
      if (dialect === 'postgres') {
        await pool.query('INSERT INTO schema_migrations (name, kind) VALUES ($1, $2)', [file, kind]);
      } else {
        await pool.query('INSERT INTO schema_migrations (name, kind) VALUES (?, ?)', [file, kind]);
      }
      console.log(`  applied ${folder}/${file}`);
      count += 1;
    } catch (error) {
      const message = error.message ?? error.sqlMessage ?? String(error);
      throw new Error(`Failed applying ${folder}/${file}: ${message}`);
    }
  }
  console.log(count === 0 ? `  ${folder}: nothing to apply` : `  ${folder}: ${count} file(s) applied`);
}

async function main() {
  const command = process.argv[2] ?? 'migrate';
  if (!['migrate', 'seed', 'status'].includes(command)) {
    throw new Error(`Unknown command "${command}". Use migrate, seed or status.`);
  }

  await loadEnv();
  const settings = dbSettings();
  
  if (command === 'seed' && process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to load synthetic seed data with NODE_ENV=production.');
  }

  const pool = await createPool(settings);
  
  try {
    console.log(`${settings.dialect.toUpperCase()} ${settings.database} @ ${settings.host}:${settings.port}`);
    await ensureLedger(pool, settings.dialect);
    
    if (command === 'status') {
      let rows;
      if (settings.dialect === 'postgres') {
        const { rows: r } = await pool.query('SELECT name, kind, applied_at FROM schema_migrations ORDER BY applied_at');
        rows = r;
      } else {
        const [r] = await pool.query('SELECT name, kind, applied_at FROM schema_migrations ORDER BY applied_at');
        rows = r;
      }
      console.table(rows);
    } else {
      await apply(pool, settings.dialect, command === 'migrate' ? 'migration' : 'seed');
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  const hint =
    error.code === 'ECONNREFUSED'
      ? ` (is ${settings?.dialect ?? 'database'} running and DB_HOST/DB_PORT correct?)`
      : error.code === '28P01' || error.code === 'ER_ACCESS_DENIED_ERROR'
        ? ' (check DB_USER/DB_PASSWORD)'
        : '';
  console.error(`db: ${error.message}${hint}`);
  process.exitCode = 1;
});
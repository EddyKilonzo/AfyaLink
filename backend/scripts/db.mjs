#!/usr/bin/env node
/**
 * Minimal SQL migration/seed runner for AfyaLink.
 *
 *   node scripts/db.mjs migrate   create the database (if allowed) and apply backend/database/migrations/*.sql
 *   node scripts/db.mjs seed      apply backend/database/seeds/*.sql (synthetic data, dev only)
 *   node scripts/db.mjs status    list applied migrations
 *
 * Applied files are recorded in `schema_migrations`, so each runs once.
 * Reads DB_* settings from backend/.env or the root .env.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import mysql from 'mysql2/promise';

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
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      process.env.DB_HOST = url.hostname;
      process.env.DB_PORT = url.port || '3306';
      process.env.DB_USER = decodeURIComponent(url.username);
      process.env.DB_PASSWORD = decodeURIComponent(url.password);
      process.env.DB_NAME = decodeURIComponent(url.pathname.replace(/^\//, ''));
    } catch {
      throw new Error('DATABASE_URL is not a valid mysql://user:pass@host:port/db URL.');
    }
  }
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('DB_HOST, DB_USER and DB_NAME must be set (see .env.example).');
  }
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    throw new Error('DB_NAME may only contain letters, digits and underscores.');
  }
  return {
    host: DB_HOST,
    port: Number(DB_PORT ?? 3306),
    user: DB_USER,
    password: DB_PASSWORD ?? '',
    database: DB_NAME,
  };
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

async function connect(settings) {
  // Connect without a default schema first so the database can be created.
  const server = await mysql.createConnection({ ...settings, database: undefined, multipleStatements: true });
  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${settings.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (error) {
    // The account may lack CREATE privileges; that is fine if the DB already exists.
    if (error.code !== 'ER_DBACCESS_DENIED_ERROR' && error.code !== 'ER_ACCESS_DENIED_ERROR') throw error;
  } finally {
    await server.end();
  }
  return mysql.createConnection({ ...settings, multipleStatements: true });
}

async function ensureLedger(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) NOT NULL PRIMARY KEY,
    kind ENUM('migration','seed') NOT NULL,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function apply(conn, kind) {
  const folder = kind === 'migration' ? 'migrations' : 'seeds';
  const [rows] = await conn.query('SELECT name FROM schema_migrations WHERE kind = ?', [kind]);
  const applied = new Set(rows.map((r) => r.name));
  const files = await sqlFiles(folder);
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(databaseDir, folder, file), 'utf8');
    try {
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name, kind) VALUES (?, ?)', [file, kind]);
      console.log(`  applied ${folder}/${file}`);
      count += 1;
    } catch (error) {
      throw new Error(`Failed applying ${folder}/${file}: [${error.code ?? 'ERROR'}] ${error.sqlMessage ?? error.message}`);
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

  let conn;
  try {
    conn = await connect(settings);
    await ensureLedger(conn);
    console.log(`Database ${settings.database} @ ${settings.host}:${settings.port}`);
    if (command === 'status') {
      const [rows] = await conn.query('SELECT name, kind, applied_at FROM schema_migrations ORDER BY applied_at');
      console.table(rows);
    } else {
      await apply(conn, command === 'migrate' ? 'migration' : 'seed');
    }
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

main().catch((error) => {
  const hint =
    error.code === 'ECONNREFUSED'
      ? ' (is MySQL running and DB_HOST/DB_PORT correct?)'
      : error.code === 'ER_ACCESS_DENIED_ERROR'
        ? ' (check DB_USER/DB_PASSWORD)'
        : '';
  console.error(`db: ${error.message}${hint}`);
  process.exitCode = 1;
});

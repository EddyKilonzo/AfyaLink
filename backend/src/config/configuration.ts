import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  /** Express "trust proxy" hops; set when running behind a reverse proxy so rate limits see real client IPs. */
  trustProxy: number;
  bodyLimit: string;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    configured: boolean;
  };
  auth: {
    jwtSecret: string;
    sessionTtlSeconds: number;
    cookieSecure: boolean;
    maxLoginFailures: number;
    lockoutMinutes: number;
  };
}

const logger = new Logger('Configuration');

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface DbParts {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/** Parses mysql://user:pass@host:3306/dbname. Returns null when absent or malformed. */
function parseDatabaseUrl(url: string | undefined): DbParts | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/^mysql2?:$/.test(parsed.protocol)) throw new Error('unsupported protocol');
    return {
      host: parsed.hostname,
      port: int(parsed.port, 3306),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    };
  } catch {
    logger.warn('DATABASE_URL is set but could not be parsed (expected mysql://user:pass@host:port/db). Falling back to DB_* variables.');
    return null;
  }
}

/**
 * Builds the typed application config from process.env.
 * Fails fast in production when required secrets are missing; in development
 * it falls back to an ephemeral session secret so the API (and /api/health) can
 * still boot before the developer has created a .env file.
 *
 * Accepted aliases: SESSION_SECRET = JWT_SECRET, FRONTEND_ORIGIN = CORS_ORIGINS,
 * DATABASE_URL = DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
 */
export function loadConfiguration(): AppConfig {
  const env = process.env;
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  let jwtSecret = env.SESSION_SECRET || env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    if (isProduction) {
      throw new Error('SESSION_SECRET (or JWT_SECRET) must be set to at least 32 characters in production.');
    }
    logger.warn(
      'SESSION_SECRET is missing or shorter than 32 characters. Using an ephemeral development secret; sessions will not survive restarts.',
    );
    jwtSecret = randomBytes(48).toString('hex');
  }

  const fromUrl = parseDatabaseUrl(env.DATABASE_URL);
  const db: DbParts = fromUrl ?? {
    host: env.DB_HOST ?? '',
    port: int(env.DB_PORT, 3306),
    username: env.DB_USER ?? '',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? '',
  };

  const origins = (env.CORS_ORIGINS || env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (isProduction && origins.some((o) => o === '*' || o.startsWith('http://'))) {
    throw new Error('In production, CORS origins must be explicit https:// origins.');
  }

  const cookieSecure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProduction;
  if (isProduction && !cookieSecure) {
    throw new Error('COOKIE_SECURE must not be false in production (session cookies require HTTPS).');
  }

  return {
    nodeEnv,
    isProduction,
    port: int(env.PORT ?? env.BACKEND_PORT, 3001),
    corsOrigins: origins,
    trustProxy: int(env.TRUST_PROXY, 0),
    bodyLimit: env.BODY_LIMIT ?? '256kb',
    db: {
      ...db,
      host: db.host || 'localhost',
      configured: Boolean(db.host && db.database && db.username),
    },
    auth: {
      jwtSecret,
      sessionTtlSeconds: int(env.SESSION_TTL_SECONDS, 60 * 60 * 8),
      cookieSecure,
      maxLoginFailures: int(env.LOGIN_MAX_FAILURES, 5),
      lockoutMinutes: int(env.LOGIN_LOCKOUT_MINUTES, 15),
    },
  };
}

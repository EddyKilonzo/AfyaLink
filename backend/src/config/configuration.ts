import { hkdfSync, randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  /** Express "trust proxy" hops; set when running behind a reverse proxy so rate limits see real client IPs. */
  trustProxy: number;
  bodyLimit: string;
  /** False only when RATE_LIMIT_DISABLED=true outside production (automated HTTP test runs). */
  rateLimitEnabled: boolean;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    /** Database dialect: 'mysql' or 'postgres' */
    dialect: 'mysql' | 'postgres';
    /** Postgres TLS: 'off', 'verify' (certificate checked) or 'no-verify'. Ignored for MySQL. */
    ssl: DbSsl;
    configured: boolean;
  };
  auth: {
    jwtSecret: string;
    sessionTtlSeconds: number;
    cookieSecure: boolean;
    maxLoginFailures: number;
    /** Failures for one account from any IP before it locks for everyone. */
    accountMaxFailures: number;
    lockoutMinutes: number;
    /** 32-byte AES-256-GCM key for TOTP secrets at rest. */
    mfaKey: Buffer;
  };
  mail: MailConfig;
}

/**
 * Outgoing email. `smtp` sends for real; `log` (development default) logs a
 * one-line summary instead of sending; `none` turns email off.
 */
export interface MailConfig {
  transport: 'smtp' | 'log' | 'none';
  /** RFC 5322 sender, e.g. `AfyaLink <no-reply@example.org>`. */
  from: string;
  /** Public frontend URL used for links in emails (never taken from a request). */
  appUrl: string;
  smtp: {
    host: string;
    port: number;
    /** true = implicit TLS (port 465); false = STARTTLS, which is then required. */
    secure: boolean;
    user: string;
    password: string;
  };
}

const logger = new Logger('Configuration');

/** Accepts 64 hex characters or base64 that decodes to exactly 32 bytes. */
function parseKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const trimmed = value.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(trimmed) ? Buffer.from(trimmed, 'hex') : Buffer.from(trimmed, 'base64');
  return key.length === 32 ? key : null;
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type DbSsl = 'off' | 'verify' | 'no-verify';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);

/**
 * Postgres TLS mode. DB_SSL wins (off | verify | no-verify); otherwise the URL's
 * `sslmode` (disable → off, no-verify → no-verify, anything else → verify);
 * otherwise off for a local server and verify for a remote one, so managed
 * databases such as Neon get a checked certificate by default.
 */
function resolveDbSsl(explicit: string | undefined, url: string | undefined, host: string): DbSsl {
  const value = explicit?.trim().toLowerCase();
  if (value) {
    if (value === 'off' || value === 'false' || value === 'disable') return 'off';
    if (value === 'no-verify') return 'no-verify';
    if (value === 'verify' || value === 'true' || value === 'require') return 'verify';
    throw new Error('DB_SSL must be one of off, verify, no-verify.');
  }
  let mode: string | null = null;
  try {
    mode = url ? new URL(url).searchParams.get('sslmode') : null;
  } catch {
    // Malformed URLs are reported by parseDatabaseUrl.
  }
  if (mode === 'disable') return 'off';
  if (mode === 'no-verify') return 'no-verify';
  if (mode) return 'verify';
  return LOCAL_HOSTS.has(host) ? 'off' : 'verify';
}

interface DbParts {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  dialect: 'mysql' | 'postgres';
}

/** Parses mysql:// or postgresql:// URLs. Returns null when absent or malformed. */
function parseDatabaseUrl(url: string | undefined): DbParts | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let dialect: 'mysql' | 'postgres';
    const defaultPort = parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:' ? 5432 : 3306;
    if (/^mysql2?:$/.test(parsed.protocol)) {
      dialect = 'mysql';
    } else if (/^postgres(?:ql)?:$/.test(parsed.protocol)) {
      dialect = 'postgres';
    } else {
      throw new Error('unsupported protocol');
    }
    return {
      host: parsed.hostname,
      port: int(parsed.port, defaultPort),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
      dialect,
    };
  } catch {
    logger.warn('DATABASE_URL is set but could not be parsed (expected mysql:// or postgresql://). Falling back to DB_* variables.');
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

  let mfaKey = parseKey(env.MFA_ENCRYPTION_KEY);
  if (env.MFA_ENCRYPTION_KEY && !mfaKey) {
    throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes, as 64 hex characters or base64.');
  }
  if (!mfaKey) {
    if (isProduction) throw new Error('MFA_ENCRYPTION_KEY must be set in production.');
    // Development: derive a separate key from the session secret. Two-factor
    // secrets become unreadable if the session secret changes.
    mfaKey = Buffer.from(hkdfSync('sha256', jwtSecret, '', 'afyalink-mfa-key', 32));
  }

  const fromUrl = parseDatabaseUrl(env.DATABASE_URL);
  const rawDialect = env.DB_DIALECT ?? (fromUrl?.dialect ?? 'mysql');
  const dialect: 'mysql' | 'postgres' = rawDialect === 'postgres' ? 'postgres' : 'mysql';
  const db: DbParts = fromUrl ?? {
    host: env.DB_HOST ?? '',
    port: int(env.DB_PORT, dialect === 'postgres' ? 5432 : 3306),
    username: env.DB_USER ?? '',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? '',
    dialect,
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

  const rateLimitDisabled = env.RATE_LIMIT_DISABLED === 'true';
  if (isProduction && rateLimitDisabled) {
    throw new Error('RATE_LIMIT_DISABLED must not be set in production.');
  }
  if (rateLimitDisabled) logger.warn('Rate limiting is DISABLED (RATE_LIMIT_DISABLED=true). Use only for local test runs.');

  const mail = loadMailConfig(env, isProduction, origins[0] ?? 'http://localhost:3000');

  return {
    nodeEnv,
    isProduction,
    port: int(env.PORT ?? env.BACKEND_PORT, 3001),
    corsOrigins: origins,
    trustProxy: int(env.TRUST_PROXY, 0),
    bodyLimit: env.BODY_LIMIT ?? '256kb',
    rateLimitEnabled: !rateLimitDisabled,
    db: {
      ...db,
      host: db.host || 'localhost',
      ssl: resolveDbSsl(env.DB_SSL, env.DATABASE_URL, db.host),
      configured: Boolean(db.host && db.database && db.username),
    },
    auth: {
      jwtSecret,
      sessionTtlSeconds: int(env.SESSION_TTL_SECONDS, 60 * 60 * 8),
      cookieSecure,
      maxLoginFailures: int(env.LOGIN_MAX_FAILURES, 5),
      accountMaxFailures: int(env.LOGIN_ACCOUNT_MAX_FAILURES, 25),
      lockoutMinutes: int(env.LOGIN_LOCKOUT_MINUTES, 15),
      mfaKey,
    },
    mail,
  };
}

const MAIL_TRANSPORTS = ['smtp', 'log', 'none'] as const;
// Display name and address only; CR/LF would allow header injection.
const MAIL_FROM = /^[^\r\n<>]{0,80}<[^\s@<>]+@[^\s@<>]+>$|^[^\s@<>]+@[^\s@<>]+$/;

function loadMailConfig(env: NodeJS.ProcessEnv, isProduction: boolean, defaultAppUrl: string): MailConfig {
  const requested = env.MAIL_TRANSPORT?.trim().toLowerCase() || undefined;
  if (requested && !(MAIL_TRANSPORTS as readonly string[]).includes(requested)) {
    throw new Error(`MAIL_TRANSPORT must be one of ${MAIL_TRANSPORTS.join(', ')}.`);
  }
  const host = env.SMTP_HOST?.trim() ?? '';
  const transport = (requested ?? (host ? 'smtp' : isProduction ? 'none' : 'log')) as MailConfig['transport'];

  const from = (env.MAIL_FROM || 'AfyaLink <no-reply@afyalink.test>').trim();
  if (!MAIL_FROM.test(from)) throw new Error('MAIL_FROM must be "Name <address@domain>" or "address@domain".');

  const appUrl = (env.APP_URL || defaultAppUrl).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(appUrl);
    if (isProduction && parsed.protocol !== 'https:') throw new Error('not https');
  } catch {
    throw new Error(isProduction ? 'APP_URL must be an https:// URL in production.' : 'APP_URL must be a valid URL.');
  }

  const port = int(env.SMTP_PORT, 587);
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465;
  if (transport === 'smtp') {
    if (!host) throw new Error('MAIL_TRANSPORT=smtp requires SMTP_HOST.');
    if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
      throw new Error('Set both SMTP_USER and SMTP_PASSWORD, or neither.');
    }
  }
  if (isProduction && transport === 'log') {
    logger.warn('MAIL_TRANSPORT=log in production: account emails are not being delivered.');
  }

  return {
    transport,
    from,
    appUrl,
    smtp: { host, port, secure, user: env.SMTP_USER || '', password: env.SMTP_PASSWORD || '' },
  };
}

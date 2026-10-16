import { loadConfiguration } from './configuration.js';

describe('loadConfiguration', () => {
  const original = { ...process.env };
  const production = {
    NODE_ENV: 'production',
    SESSION_SECRET: 's'.repeat(48),
    CORS_ORIGINS: 'https://afyalink.example',
    COOKIE_SECURE: 'true',
    MFA_ENCRYPTION_KEY: 'k'.repeat(64).replace(/k/g, 'a'),
  };

  afterEach(() => {
    process.env = { ...original };
  });

  it('accepts a complete production configuration', () => {
    Object.assign(process.env, production);
    const config = loadConfiguration();
    expect(config.isProduction).toBe(true);
    expect(config.rateLimitEnabled).toBe(true);
  });

  it('refuses to disable rate limiting in production', () => {
    Object.assign(process.env, production, { RATE_LIMIT_DISABLED: 'true' });
    expect(() => loadConfiguration()).toThrow(/RATE_LIMIT_DISABLED/);
  });

  it('refuses a short session secret, http origins or insecure cookies in production', () => {
    Object.assign(process.env, production, { SESSION_SECRET: 'short' });
    expect(() => loadConfiguration()).toThrow(/SESSION_SECRET/);
    Object.assign(process.env, production, { CORS_ORIGINS: 'http://afyalink.example' });
    expect(() => loadConfiguration()).toThrow(/https/);
    Object.assign(process.env, production, { COOKIE_SECURE: 'false' });
    expect(() => loadConfiguration()).toThrow(/COOKIE_SECURE/);
  });

  it('allows disabling rate limiting outside production', () => {
    Object.assign(process.env, { NODE_ENV: 'test', RATE_LIMIT_DISABLED: 'true' });
    expect(loadConfiguration().rateLimitEnabled).toBe(false);
  });

  it('requires a valid two-factor encryption key in production', () => {
    Object.assign(process.env, production, { MFA_ENCRYPTION_KEY: '' });
    expect(() => loadConfiguration()).toThrow(/MFA_ENCRYPTION_KEY/);
    Object.assign(process.env, production, { MFA_ENCRYPTION_KEY: 'too-short' });
    expect(() => loadConfiguration()).toThrow(/32 bytes/);
  });

  it('derives a development two-factor key when none is set', () => {
    Object.assign(process.env, { NODE_ENV: 'development', SESSION_SECRET: 's'.repeat(48), MFA_ENCRYPTION_KEY: '' });
    expect(loadConfiguration().auth.mfaKey).toHaveLength(32);
  });

  describe('database TLS', () => {
    const dev = { NODE_ENV: 'development', SESSION_SECRET: 's'.repeat(48), DB_SSL: '', DATABASE_URL: '', DB_HOST: '' };
    const ssl = (env: Record<string, string>) => {
      Object.assign(process.env, dev, env);
      return loadConfiguration().db.ssl;
    };

    it('verifies certificates for remote servers and skips TLS for local ones by default', () => {
      expect(ssl({ DATABASE_URL: 'postgresql://u:p@ep-x.neon.tech/db' })).toBe('verify');
      expect(ssl({ DATABASE_URL: 'postgresql://u:p@127.0.0.1:5433/db' })).toBe('off');
      expect(ssl({ DB_DIALECT: 'postgres', DB_HOST: 'localhost', DB_USER: 'u', DB_NAME: 'db' })).toBe('off');
    });

    it('follows sslmode in the URL, and DB_SSL over both', () => {
      expect(ssl({ DATABASE_URL: 'postgresql://u:p@ep-x.neon.tech/db?sslmode=require' })).toBe('verify');
      expect(ssl({ DATABASE_URL: 'postgresql://u:p@ep-x.neon.tech/db?sslmode=disable' })).toBe('off');
      expect(ssl({ DATABASE_URL: 'postgresql://u:p@ep-x.neon.tech/db?sslmode=require', DB_SSL: 'no-verify' })).toBe('no-verify');
      expect(() => ssl({ DB_SSL: 'sometimes' })).toThrow(/DB_SSL/);
    });
  });

  describe('mail', () => {
    const dev = { NODE_ENV: 'development', SESSION_SECRET: 's'.repeat(48) };
    const clearMail = { MAIL_TRANSPORT: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASSWORD: '', MAIL_FROM: '', APP_URL: '' };

    it('logs instead of sending in development and is off in production without SMTP', () => {
      Object.assign(process.env, dev, clearMail);
      expect(loadConfiguration().mail.transport).toBe('log');
      Object.assign(process.env, production, clearMail);
      expect(loadConfiguration().mail.transport).toBe('none');
    });

    it('uses SMTP when a host is set, with STARTTLS on 587 and implicit TLS on 465', () => {
      Object.assign(process.env, dev, clearMail, { SMTP_HOST: 'smtp.test' });
      expect(loadConfiguration().mail.smtp).toMatchObject({ host: 'smtp.test', port: 587, secure: false });
      Object.assign(process.env, { SMTP_PORT: '465' });
      expect(loadConfiguration().mail.smtp.secure).toBe(true);
    });

    it('rejects incomplete or unsafe settings', () => {
      Object.assign(process.env, dev, clearMail, { MAIL_TRANSPORT: 'smtp' });
      expect(() => loadConfiguration()).toThrow(/SMTP_HOST/);
      Object.assign(process.env, dev, clearMail, { SMTP_HOST: 'smtp.test', SMTP_USER: 'u' });
      expect(() => loadConfiguration()).toThrow(/SMTP_PASSWORD/);
      Object.assign(process.env, dev, clearMail, { MAIL_FROM: 'Eve <eve@x.test>\r\nBcc: a@b.test' });
      expect(() => loadConfiguration()).toThrow(/MAIL_FROM/);
      Object.assign(process.env, dev, clearMail, { MAIL_TRANSPORT: 'carrier-pigeon' });
      expect(() => loadConfiguration()).toThrow(/MAIL_TRANSPORT/);
      Object.assign(process.env, production, clearMail, { APP_URL: 'http://afyalink.example' });
      expect(() => loadConfiguration()).toThrow(/APP_URL/);
    });

    it('defaults the email link base to the first CORS origin', () => {
      Object.assign(process.env, production, clearMail);
      expect(loadConfiguration().mail.appUrl).toBe('https://afyalink.example');
    });
  });
});

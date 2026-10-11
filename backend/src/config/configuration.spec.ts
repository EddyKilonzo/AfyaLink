import { loadConfiguration } from './configuration.js';

describe('loadConfiguration', () => {
  const original = { ...process.env };
  const production = {
    NODE_ENV: 'production',
    SESSION_SECRET: 's'.repeat(48),
    CORS_ORIGINS: 'https://afyalink.example',
    COOKIE_SECURE: 'true',
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
});

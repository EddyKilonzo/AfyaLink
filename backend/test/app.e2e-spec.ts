import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/**
 * Boots the real HTTP pipeline with MySQL deliberately unconfigured, proving the
 * API starts without a database and that guards and error handling respond correctly.
 */
describe('AfyaLink API (e2e, no database)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // DATABASE_URL too: the root .env sets it, and it takes precedence over DB_*,
    // so without this the "no database" suite would connect to the real database.
    process.env.DATABASE_URL = '';
    process.env.DB_HOST = '';
    process.env.DB_NAME = '';
    process.env.DB_USER = '';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false, bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function csrfAgent() {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.get('/api/auth/csrf').expect(200);
    return { agent, token: res.body.csrfToken as string };
  }

  it('GET /api/health reports ok with database not_configured', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'not_configured' });
  });

  it('rejects unauthenticated access to reports with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/reports').expect(401);
    expect(res.body).toMatchObject({ statusCode: 401, path: '/api/reports' });
  });

  it('rejects login without a CSRF token with 403', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'chv.mwende@afyalink.test', password: 'AfyaLink#Dev2026' })
      .expect(403);
  });

  it('rejects state-changing requests from a disallowed origin', async () => {
    const { agent, token } = await csrfAgent();
    await agent
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', token)
      .send({ email: 'chv.mwende@afyalink.test', password: 'AfyaLink#Dev2026' })
      .expect(403);
  });

  it('validates the login body before touching the database', async () => {
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('returns 503 (not a crash) for a valid login while MySQL is not configured', async () => {
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'chv.mwende@afyalink.test', password: 'AfyaLink#Dev2026' })
      .expect(503);
    expect(res.body.message).toMatch(/not configured/i);
  });

  it('sets the CSRF cookie as HTTP-only', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/csrf').expect(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies.some((c) => c.startsWith('afya_csrf=') && /HttpOnly/i.test(c))).toBe(true);
  });

  it.each([
    ['get', '/api/locations'],
    ['get', '/api/users'],
    ['get', '/api/sync/logs'],
    ['get', '/api/analytics/map'],
  ] as const)('requires a session for %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
  });

  it('requires CSRF before authentication on new state-changing routes', async () => {
    const id = '3f1e4c2a-8b7d-4e6f-9a1b-2c3d4e5f6a7b';
    await request(app.getHttpServer()).patch(`/api/reports/${id}/status`).send({ status: 'REVIEWED' }).expect(403);
    await request(app.getHttpServer()).post('/api/users').send({}).expect(403);
    await request(app.getHttpServer()).post('/api/auth/change-password').send({}).expect(403);
  });

  it('requires a session for change-password even with a valid CSRF token', async () => {
    const { agent, token } = await csrfAgent();
    await agent
      .post('/api/auth/change-password')
      .set('X-CSRF-Token', token)
      .send({ currentPassword: 'x', newPassword: 'Another1234pass' })
      .expect(401);
  });

  it('sends security headers and no-store on every response', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('readiness answers 503 while the database is not configured', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/ready').expect(503);
    expect(res.body.message).toMatch(/not configured/i);
  });

  it('serves the OpenAPI document outside production', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);
    expect(Object.keys(res.body.paths)).toEqual(expect.arrayContaining(['/api/reports', '/api/audit-logs']));
  });

  it('tags every response and error with a request ID', async () => {
    const res = await request(app.getHttpServer()).get('/api/reports').set('X-Request-Id', 'e2e-request-1').expect(401);
    expect(res.headers['x-request-id']).toBe('e2e-request-1');
    expect(res.body.requestId).toBe('e2e-request-1');
  });

  it('rejects an unsigned CSRF value even when cookie and header match', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Cookie', 'afya_csrf=planted')
      .set('X-CSRF-Token', 'planted')
      .send({ email: 'chv.mwende@afyalink.test', password: 'AfyaLink#Dev2026' })
      .expect(403);
  });

  it.each(['/api/audit-logs', '/api/reports/export'])('requires a session for %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
});

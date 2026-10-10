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
});

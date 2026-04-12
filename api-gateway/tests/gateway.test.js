const request = require('supertest');

// ─── Mock node-fetch so gateway tests don't need real services ────────────────
jest.mock('node-fetch');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');

const app = require('../src/index');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockFetch = (body, status = 200) => {
  fetch.mockResolvedValue(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('API Gateway', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── Health ─────────────────────────────────────────────────────────────────
  describe('GET /', () => {
    it('returns a gateway landing response', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.type).toContain('html');
      expect(res.text).toContain('Notely API Gateway');
      expect(res.text).toContain('/health');
    });
  });

  describe('GET /health', () => {
    it('returns gateway healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('api-gateway');
      expect(res.body.status).toBe('healthy');
    });
  });

  // ─── Auth Proxy ──────────────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('proxies register to auth-service', async () => {
      mockFetch(
        { success: true, data: { token: 'jwt-token', user: { email: 'a@b.com' } } },
        201
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', username: 'alice', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.data.token).toBe('jwt-token');
    });
  });

  describe('POST /api/auth/login', () => {
    it('proxies login to auth-service', async () => {
      mockFetch({ success: true, data: { token: 'jwt-token' } });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────────
  describe('Protected routes without token', () => {
    it('rejects GET /api/notes without token', async () => {
      const res = await request(app).get('/api/notes');
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/users/profile without token', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });
  });

  // ─── Auth middleware — valid token flow ──────────────────────────────────────
  describe('Protected routes with valid token', () => {
    it('proxies GET /api/notes when auth-service verifies token', async () => {
      // First call: auth/verify → success
      // Second call: notes service → list
      fetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          success: true,
          data: { userId: 'u1', email: 'a@b.com', username: 'alice' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', 'Bearer valid.jwt.token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 404 ─────────────────────────────────────────────────────────────────────
  describe('GET /nonexistent', () => {
    it('returns 404', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});

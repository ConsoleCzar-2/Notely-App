const request = require('supertest');
const app = require('../src/index');

// ─── Auth Routes Tests ────────────────────────────────────────────────────────

describe('Auth Service', () => {
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
  };

  let authToken;

  // ─── Register ───────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing fields', async () => {
      const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'new@test.com', username: 'u', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  // ─── Login ──────────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      authToken = res.body.data.token;
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    it('should reject unknown email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'pass1234' });
      expect(res.status).toBe(401);
    });
  });

  // ─── Verify ─────────────────────────────────────────────────────────────────
  describe('GET /auth/verify', () => {
    it('should verify a valid token', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should reject missing token', async () => {
      const res = await request(app).get('/auth/verify');
      expect(res.status).toBe(401);
    });
  });

  // ─── Health ─────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });
});

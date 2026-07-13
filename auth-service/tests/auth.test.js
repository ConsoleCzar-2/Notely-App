const request = require('supertest');
const app = require('../src/index');
const { pool } = require('../src/config/db');

// ─── Auth Routes Tests ────────────────────────────────────────────────────────
let authToken;
let testUser;

beforeAll(async () => {
  // Create a unique test user for login/verify tests
  testUser = {
    email: `test_${Date.now()}@example.com`,
    username: `testuser_${Date.now()}`,
    password: 'Password123',
  };
  await request(app).post('/auth/register').send(testUser);
});

describe('Auth Service', () => {
  // ─── Register ───────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const uniqueUser = {
        email: `new_${Date.now()}@example.com`,
        username: `newuser_${Date.now()}`,
        password: 'Password123',
      };
      const res = await request(app).post('/auth/register').send(uniqueUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(uniqueUser.email);
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
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      authToken = res.body.data.accessToken;
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

// ─── Cleanup ──────────────────────────────────────────────────────────────────
afterAll(async () => {
  await pool.end();
});

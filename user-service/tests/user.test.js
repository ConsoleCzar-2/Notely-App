const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─── Mock pg pool so tests don't need a real DB ──────────────────────────────
const mockUser = {
  user_id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  bio: 'Hello world',
  avatar_url: null,
  created_at: new Date(),
  updated_at: new Date(),
};

jest.mock('../src/config/db', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn(),
  },
  initDB: jest.fn().mockResolvedValue(true),
}));

const { pool } = require('../src/config/db');
const app = require('../src/index');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeToken = (overrides = {}) =>
  jwt.sign(
    { userId: 'user-123', email: 'test@example.com', username: 'testuser', ...overrides },
    process.env.JWT_SECRET || 'dev_secret_change_in_prod',
    { expiresIn: '1h' }
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('User Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('GET /users/profile', () => {
    it('returns user profile', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/users/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /users/profile', () => {
    it('updates profile fields', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findByUserId
        .mockResolvedValueOnce({ rows: [{ ...mockUser, full_name: 'New Name' }] }); // update

      const res = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ fullName: 'New Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('New Name');
    });
  });

  describe('DELETE /users/account', () => {
    it('deletes account', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app)
        .delete('/users/account')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 if user not found', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });
      const res = await request(app)
        .delete('/users/account')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(404);
    });
  });
});

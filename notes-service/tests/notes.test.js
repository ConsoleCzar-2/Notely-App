const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// ─── Mock Mongoose so tests don't need a real MongoDB ─────────────────────────
jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/note.model');
const Note = require('../src/models/note.model');

const app = require('../src/index');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';

const makeToken = (overrides = {}) =>
  jwt.sign(
    { userId: 'user-abc', email: 'test@example.com', username: 'testuser', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

const mockNote = {
  _id: new mongoose.Types.ObjectId().toString(),
  userId: 'user-abc',
  title: 'My First Note',
  content: 'Hello, microservices!',
  tags: ['study', 'cs'],
  isPinned: false,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Notes Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── Health ─────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  // ─── Create Note ─────────────────────────────────────────────────────────────
  describe('POST /notes', () => {
    it('creates a note successfully', async () => {
      Note.create.mockResolvedValueOnce(mockNote);

      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'My First Note', content: 'Hello, microservices!', tags: ['study'] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('My First Note');
    });

    it('rejects note without title', async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ content: 'No title here' });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/notes').send({ title: 'T', content: 'C' });
      expect(res.status).toBe(401);
    });
  });

  // ─── List Notes ──────────────────────────────────────────────────────────────
  describe('GET /notes', () => {
    it('returns paginated list of notes', async () => {
      Note.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: jest.fn().mockResolvedValueOnce([mockNote]),
          }),
        }),
      });
      Note.countDocuments.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/notes')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  // ─── Get Single Note ─────────────────────────────────────────────────────────
  describe('GET /notes/:id', () => {
    it('returns a note by id', async () => {
      Note.findOne.mockResolvedValueOnce(mockNote);

      const res = await request(app)
        .get(`/notes/${mockNote._id}`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('My First Note');
    });

    it('returns 404 for missing note', async () => {
      Note.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Update Note ─────────────────────────────────────────────────────────────
  describe('PUT /notes/:id', () => {
    it('updates a note', async () => {
      Note.findOneAndUpdate.mockResolvedValueOnce({ ...mockNote, title: 'Updated Title' });

      const res = await request(app)
        .put(`/notes/${mockNote._id}`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('returns 400 when no fields given', async () => {
      const res = await request(app)
        .put(`/notes/${mockNote._id}`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 when note not found', async () => {
      Note.findOneAndUpdate.mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'X' });

      expect(res.status).toBe(404);
    });
  });

  // ─── Delete Note ─────────────────────────────────────────────────────────────
  describe('DELETE /notes/:id', () => {
    it('deletes a note', async () => {
      Note.findOneAndDelete.mockResolvedValueOnce(mockNote);

      const res = await request(app)
        .delete(`/notes/${mockNote._id}`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for missing note', async () => {
      Note.findOneAndDelete.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete(`/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Search Notes ─────────────────────────────────────────────────────────────
  describe('GET /notes/search', () => {
    it('returns search results', async () => {
      Note.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: jest.fn().mockResolvedValueOnce([mockNote]),
          }),
        }),
      });
      Note.countDocuments.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/notes/search?query=microservices')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('returns 400 when query is empty', async () => {
      const res = await request(app)
        .get('/notes/search')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(400);
    });
  });
});

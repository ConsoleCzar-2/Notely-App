const express = require('express');
const router = express.Router();
const config = require('../config');
const { proxyRequest } = require('../utils/proxy');
const { authenticate } = require('../middleware/authenticate');

const NOTES_URL = config.services.notes;

// All notes routes are protected
router.use(authenticate);

// GET /api/notes/search?query=...   — MUST be before /:id
router.get('/search', (req, res, next) => {
  const qs = new URLSearchParams(req.query).toString();
  proxyRequest(`${NOTES_URL}/notes/search?${qs}`, req, res, next);
});

// POST /api/notes
router.post('/', (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes`, req, res, next);
});

// GET /api/notes  — paginated list
router.get('/', (req, res, next) => {
  const qs = new URLSearchParams(req.query).toString();
  proxyRequest(`${NOTES_URL}/notes?${qs}`, req, res, next);
});

// GET /api/notes/:id
router.get('/:id', (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

// PUT /api/notes/:id
router.put('/:id', (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

module.exports = router;

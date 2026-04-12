const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
} = require('./notes.controller');

// All routes require authentication
router.use(authenticate);

// NOTE: /search must be declared BEFORE /:id to avoid Express
// treating "search" as an ObjectId parameter.

// GET /notes/search?query=keyword
router.get('/search', searchNotes);

// POST /notes
router.post('/', createNote);

// GET /notes  — paginated list
router.get('/', listNotes);

// GET /notes/:id
router.get('/:id', getNote);

// PUT /notes/:id
router.put('/:id', updateNote);

// DELETE /notes/:id
router.delete('/:id', deleteNote);

module.exports = router;

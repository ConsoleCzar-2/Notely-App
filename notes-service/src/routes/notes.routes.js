const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  restoreNote,
  searchNotes,
} = require('./notes.controller');
const {
  validateCreateNote,
  validateUpdateNote,
  validateNoteId,
  validateListNotes,
  validateSearchNotes,
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// NOTE: /search must be declared BEFORE /:id to avoid Express
// treating "search" as an ObjectId parameter.

// GET /notes/search?query=keyword
router.get('/search', validateSearchNotes, searchNotes);

// POST /notes
router.post('/', validateCreateNote, createNote);

// GET /notes  — paginated list
router.get('/', validateListNotes, listNotes);

// GET /notes/:id
router.get('/:id', validateNoteId, getNote);

// PUT /notes/:id
router.put('/:id', validateNoteId, validateUpdateNote, updateNote);

// DELETE /notes/:id
router.delete('/:id', validateNoteId, deleteNote);

// POST /notes/:id/restore - Restore a soft-deleted note
router.post('/:id/restore', validateNoteId, restoreNote);

module.exports = router;

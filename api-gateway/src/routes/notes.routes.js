const express = require('express');
const router = express.Router();
const config = require('../config');
const { proxyRequest } = require('../utils/proxy');
const { authenticate } = require('../middleware/authenticate');
const { userLimiter } = require('../middleware/rateLimiter');
const { body, param, query, validationResult } = require('express-validator');

const NOTES_URL = config.services.notes;

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Create note validation rules
 */
const validateCreateNote = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title is required and must be at most 200 characters'),
  body('content')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content is required and must be at most 50000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string of at most 50 characters'),
  handleValidationErrors,
];

/**
 * Update note validation rules
 */
const validateUpdateNote = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title must be 1-200 characters'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be 1-50000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string of at most 50 characters'),
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean'),
  handleValidationErrors,
];

/**
 * Note ID param validation
 */
const validateNoteId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid note ID format'),
  handleValidationErrors,
];

/**
 * List notes query validation
 */
const validateListNotes = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('archived')
    .optional()
    .isBoolean()
    .withMessage('Archived must be a boolean'),
  query('pinned')
    .optional()
    .isBoolean()
    .withMessage('Pinned must be a boolean'),
  handleValidationErrors,
];

/**
 * Search notes query validation
 */
const validateSearchNotes = [
  query('query')
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Search query is required and must be at most 200 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// All notes routes are protected
router.use(authenticate);
router.use(userLimiter);

/**
 * @openapi
 * /api/v1/notes/search:
 *   get:
 *     tags: [Notes]
 *     summary: Search notes
 *     description: Full-text search across the authenticated user's notes.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string, maxLength: 200 }
 *         description: Search term.
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *         description: Results per page.
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     notes:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Note' }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/notes/search?query=...   — MUST be before /:id
router.get('/search', validateSearchNotes, (req, res, next) => {
  const qs = new URLSearchParams(req.query).toString();
  proxyRequest(`${NOTES_URL}/notes/search?${qs}`, req, res, next);
});

/**
 * @openapi
 * /api/v1/notes:
 *   post:
 *     tags: [Notes]
 *     summary: Create a note
 *     description: Creates a new note for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: My first note
 *               content:
 *                 type: string
 *                 maxLength: 50000
 *                 example: This is the note body.
 *               tags:
 *                 type: array
 *                 items: { type: string, maxLength: 50 }
 *                 example: [work, ideas]
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Note' }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// POST /api/notes
router.post('/', validateCreateNote, (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes`, req, res, next);
});

/**
 * @openapi
 * /api/v1/notes:
 *   get:
 *     tags: [Notes]
 *     summary: List notes
 *     description: Returns a paginated list of the authenticated user's notes.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *         description: Results per page.
 *       - in: query
 *         name: archived
 *         schema: { type: boolean, default: false }
 *         description: Filter archived notes.
 *       - in: query
 *         name: pinned
 *         schema: { type: boolean }
 *         description: Filter pinned notes.
 *     responses:
 *       200:
 *         description: Notes list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     notes:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Note' }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/notes  — paginated list
router.get('/', validateListNotes, (req, res, next) => {
  const qs = new URLSearchParams(req.query).toString();
  proxyRequest(`${NOTES_URL}/notes?${qs}`, req, res, next);
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   get:
 *     tags: [Notes]
 *     summary: Get a note by ID
 *     description: Retrieves a single note owned by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: MongoDB ObjectId of the note.
 *     responses:
 *       200:
 *         description: Note retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Note' }
 *       400:
 *         description: Invalid note ID format
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/notes/:id
router.get('/:id', validateNoteId, (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   put:
 *     tags: [Notes]
 *     summary: Update a note
 *     description: Updates one or more fields of a note owned by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: MongoDB ObjectId of the note.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 maxLength: 50000
 *               tags:
 *                 type: array
 *                 items: { type: string, maxLength: 50 }
 *               isPinned:
 *                 type: boolean
 *               isArchived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Note updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Note' }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// PUT /api/notes/:id
router.put('/:id', validateNoteId, validateUpdateNote, (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   delete:
 *     tags: [Notes]
 *     summary: Delete a note
 *     description: Permanently deletes a note owned by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: MongoDB ObjectId of the note.
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Note deleted successfully' }
 *       400:
 *         description: Invalid note ID format
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// DELETE /api/notes/:id
router.delete('/:id', validateNoteId, (req, res, next) => {
  proxyRequest(`${NOTES_URL}/notes/${req.params.id}`, req, res, next);
});

module.exports = router;

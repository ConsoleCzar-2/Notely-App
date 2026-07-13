const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 * Returns 400 with formatted validation errors
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

module.exports = {
  validateCreateNote,
  validateUpdateNote,
  validateNoteId,
  validateListNotes,
  validateSearchNotes,
  handleValidationErrors,
};
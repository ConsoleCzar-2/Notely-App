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
 * Update profile validation rules
 */
const validateUpdateProfile = [
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Full name must be 1-100 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Bio must be at most 500 characters'),
  body('avatarUrl')
    .optional()
    .isURL({ protocols: ['http', 'https', 'data'] })
    .withMessage('Avatar URL must be a valid HTTP/HTTPS/data URL'),
  handleValidationErrors,
];

/**
 * User ID param validation
 */
const validateUserId = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
  handleValidationErrors,
];

module.exports = {
  validateUpdateProfile,
  validateUserId,
  handleValidationErrors,
};
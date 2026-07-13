const express = require('express');
const router = express.Router();
const config = require('../config');
const { proxyRequest } = require('../utils/proxy');
const { authenticate } = require('../middleware/authenticate');
const { userLimiter } = require('../middleware/rateLimiter');
const { body, param, validationResult } = require('express-validator');

const USER_URL = config.services.user;

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

// All user routes are protected
router.use(authenticate);
router.use(userLimiter);

/**
 * @openapi
 * /api/v1/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's profile
 *     description: Retrieves the authenticated user's profile from the User Service.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string }
 *                     fullName: { type: string }
 *                     bio: { type: string }
 *                     avatarUrl: { type: string, format: uri }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/users/profile
router.get('/profile', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/profile`, req, res, next);
});

/**
 * @openapi
 * /api/v1/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update the current user's profile
 *     description: Updates profile fields (fullName, bio, avatarUrl) in the User Service.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 maxLength: 100
 *                 example: John Doe
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Avid note-taker.
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.png
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string }
 *                     fullName: { type: string }
 *                     bio: { type: string }
 *                     avatarUrl: { type: string, format: uri }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// PUT /api/users/profile
router.put('/profile', validateUpdateProfile, (req, res, next) => {
  proxyRequest(`${USER_URL}/users/profile`, req, res, next);
});

/**
 * @openapi
 * /api/v1/users/account:
 *   delete:
 *     tags: [Users]
 *     summary: Delete the current user's account
 *     description: Permanently deletes the authenticated user's account in the User Service.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Account deleted successfully' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// DELETE /api/users/account
router.delete('/account', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/account`, req, res, next);
});

/**
 * @openapi
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Look up a public user profile by ID
 *     description: Returns the public profile for the given user UUID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID to look up.
 *     responses:
 *       200:
 *         description: Public profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string }
 *                     fullName: { type: string }
 *                     bio: { type: string }
 *                     avatarUrl: { type: string, format: uri }
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/users/:userId  — public profile lookup
router.get('/:userId', validateUserId, (req, res, next) => {
  proxyRequest(`${USER_URL}/users/${req.params.userId}`, req, res, next);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const config = require('../config');
const { proxyRequest } = require('../utils/proxy');
const { authenticate } = require('../middleware/authenticate');

const USER_URL = config.services.user;

// All user routes are protected
router.use(authenticate);

// GET /api/users/profile
router.get('/profile', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/profile`, req, res, next);
});

// PUT /api/users/profile
router.put('/profile', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/profile`, req, res, next);
});

// DELETE /api/users/account
router.delete('/account', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/account`, req, res, next);
});

// GET /api/users/:userId  — public profile lookup
router.get('/:userId', (req, res, next) => {
  proxyRequest(`${USER_URL}/users/${req.params.userId}`, req, res, next);
});

module.exports = router;

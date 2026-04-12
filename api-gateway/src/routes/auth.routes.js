const express = require('express');
const router = express.Router();
const config = require('../config');
const { proxyRequest } = require('../utils/proxy');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');

const AUTH_URL = config.services.auth;

// POST /api/auth/register  — public
router.post('/register', authLimiter, (req, res, next) => {
  proxyRequest(`${AUTH_URL}/auth/register`, req, res, next);
});

// POST /api/auth/login  — public
router.post('/login', authLimiter, (req, res, next) => {
  proxyRequest(`${AUTH_URL}/auth/login`, req, res, next);
});

// POST /api/auth/logout  — protected
router.post('/logout', authenticate, (req, res, next) => {
  proxyRequest(`${AUTH_URL}/auth/logout`, req, res, next);
});

// GET /api/auth/me  — protected, returns decoded user from token
router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    data: {
      userId:   req.headers['x-user-id'],
      email:    req.headers['x-user-email'],
      username: req.headers['x-user-username'],
    },
  });
});

module.exports = router;

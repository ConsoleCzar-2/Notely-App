const express = require('express');
const router = express.Router();
const { register, login, logout, verify } = require('./auth.controller');

// POST /auth/register
router.post('/register', register);

// POST /auth/login
router.post('/login', login);

// POST /auth/logout  (requires valid JWT in header)
router.post('/logout', logout);

// GET /auth/verify  (called internally by API Gateway)
router.get('/verify', verify);

module.exports = router;

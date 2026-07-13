const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, verify } = require('./auth.controller');
const { validateRegister, validateLogin, validateLogout, validateRefresh } = require('../middleware/validation');

// POST /auth/register
router.post('/register', validateRegister, register);

// POST /auth/login
router.post('/login', validateLogin, login);

// POST /auth/refresh - Rotate refresh token
router.post('/refresh', validateRefresh, refresh);

// POST /auth/logout  (requires valid JWT in header)
router.post('/logout', validateLogout, logout);

// GET /auth/verify  (called internally by API Gateway)
router.get('/verify', verify);

module.exports = router;

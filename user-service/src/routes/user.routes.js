const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { getProfile, updateProfile, deleteAccount, getUserById } = require('./user.controller');

// All routes require authentication
router.use(authenticate);

// GET /users/profile  — own profile
router.get('/profile', getProfile);

// PUT /users/profile  — update own profile
router.put('/profile', updateProfile);

// DELETE /users/account  — delete own account
router.delete('/account', deleteAccount);

// GET /users/:userId  — look up any user (internal usage)
router.get('/:userId', getUserById);

module.exports = router;

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign a JWT with user payload
 * @param {object} payload - { userId, email, username }
 * @returns {string} signed token
 */
const signToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Decode without verifying (useful for reading exp on blacklisted tokens)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = { signToken, verifyToken, decodeToken };

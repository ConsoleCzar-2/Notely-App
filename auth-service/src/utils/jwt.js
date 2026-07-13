const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign an access JWT with user payload
 * @param {object} payload - { userId, email, username }
 * @returns {string} signed token
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

/**
 * Sign a refresh JWT with user payload
 * @param {object} payload - { userId, email, username }
 * @returns {string} signed token
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });
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

module.exports = { signAccessToken, signRefreshToken, verifyToken, decodeToken };

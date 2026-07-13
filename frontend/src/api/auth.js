/**
 * Auth API service
 */

import { apiClient } from './client';

export const authApi = {
  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @param {string} data.email - User email
   * @param {string} data.username - Username
   * @param {string} data.password - Password
   * @returns {Promise<Object>} Auth response with token and user
   */
  async register({ email, username, password }) {
    return apiClient.post('/auth/register', { email, username, password });
  },

  /**
   * Login user
   * @param {Object} data - Login credentials
   * @param {string} data.email - User email
   * @param {string} data.password - Password
   * @returns {Promise<Object>} Auth response with token and user
   */
  async login({ email, password }) {
    return apiClient.post('/auth/login', { email, password });
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access and refresh tokens
   */
  async refreshToken(refreshToken) {
    return apiClient.post('/auth/refresh', { refreshToken });
  },

  /**
   * Verify token validity
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Verification result with user data
   */
  async verifyToken(token) {
    return apiClient.post('/auth/verify', { token });
  },

  /**
   * Get current user info
   * @param {string} token - Access token
   * @returns {Promise<Object>} Current user data
   */
  async getMe(token) {
    return apiClient.get('/auth/me', token);
  },

  /**
   * Logout user (revoke refresh token)
   * @param {string} token - Access token
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<Object>} Logout confirmation
   */
  async logout(token, refreshToken) {
    return apiClient.post('/auth/logout', { refreshToken }, token);
  },
};
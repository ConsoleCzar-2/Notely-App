/**
 * Users API service
 */

import { apiClient } from './client';

export const usersApi = {
  /**
   * Get current user's profile
   * @param {string} token - Access token
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(token) {
    return apiClient.get('/users/profile', token);
  },

  /**
   * Update current user's profile
   * @param {Object} data - Profile data
   * @param {string} data.fullName - Full name
   * @param {string} data.bio - Bio
   * @param {string} data.avatarUrl - Avatar URL
   * @param {string} token - Access token
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile({ fullName, bio, avatarUrl }, token) {
    return apiClient.put('/users/profile', { fullName, bio, avatarUrl }, token);
  },

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @param {string} token - Access token
   * @returns {Promise<Object>} User data
   */
  async getUser(id, token) {
    return apiClient.get(`/users/${id}`, token);
  },

  /**
   * Get all users (paginated)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} token - Access token
   * @returns {Promise<Object>} Paginated users response
   */
  async getUsers(params = {}, token) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(endpoint, token);
  },
};
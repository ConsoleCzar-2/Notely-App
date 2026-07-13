/**
 * Notes API service
 */

import { apiClient } from './client';

export const notesApi = {
  /**
   * Get all notes with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {boolean} params.archived - Filter by archived status
   * @param {boolean} params.pinned - Filter by pinned status
   * @param {string} params.search - Search query
   * @param {string} params.tags - Comma-separated tags
   * @param {string} params.sortBy - Sort field (createdAt, updatedAt, title)
   * @param {string} params.sortOrder - Sort order (asc, desc)
   * @param {string} token - Access token
   * @returns {Promise<Object>} Paginated notes response
   */
  async getNotes(params = {}, token) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    const endpoint = `/notes${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(endpoint, token);
  },

  /**
   * Get a single note by ID
   * @param {string} id - Note ID
   * @param {string} token - Access token
   * @returns {Promise<Object>} Note data
   */
  async getNote(id, token) {
    return apiClient.get(`/notes/${id}`, token);
  },

  /**
   * Create a new note
   * @param {Object} data - Note data
   * @param {string} data.title - Note title
   * @param {string} data.content - Note content
   * @param {string[]} data.tags - Array of tags
   * @param {string} token - Access token
   * @returns {Promise<Object>} Created note
   */
  async createNote({ title, content, tags = [] }, token) {
    return apiClient.post('/notes', { title, content, tags }, token);
  },

  /**
   * Update a note
   * @param {string} id - Note ID
   * @param {Object} data - Note data to update
   * @param {string} data.title - Note title
   * @param {string} data.content - Note content
   * @param {string[]} data.tags - Array of tags
   * @param {boolean} data.isPinned - Pinned status
   * @param {boolean} data.isArchived - Archived status
   * @param {string} token - Access token
   * @returns {Promise<Object>} Updated note
   */
  async updateNote(id, { title, content, tags, isPinned, isArchived }, token) {
    return apiClient.put(`/notes/${id}`, { title, content, tags, isPinned, isArchived }, token);
  },

  /**
   * Delete a note
   * @param {string} id - Note ID
   * @param {string} token - Access token
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteNote(id, token) {
    return apiClient.delete(`/notes/${id}`, token);
  },

  /**
   * Search notes
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} token - Access token
   * @returns {Promise<Object>} Search results
   */
  async searchNotes({ query, page = 1, limit = 20 }, token) {
    const searchParams = new URLSearchParams({
      query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return apiClient.get(`/notes/search?${searchParams.toString()}`, token);
  },

  /**
   * Bulk actions on notes
   * @param {Object} data - Bulk action data
   * @param {string[]} data.noteIds - Array of note IDs
   * @param {string} data.action - Action to perform (archive, unarchive, pin, unpin, delete)
   * @param {string} token - Access token
   * @returns {Promise<Object>} Bulk action result
   */
  async bulkAction({ noteIds, action }, token) {
    return apiClient.post('/notes/bulk', { noteIds, action }, token);
  },
};
/**
 * Utility functions for the frontend
 */

export const TOKEN_KEY = 'notely.token';
export const USER_KEY = 'notely.user';
export const REFRESH_TOKEN_KEY = 'notely.refreshToken';

export const restoreSession = () => {
  if (typeof window === 'undefined') {
    return { token: '', user: null };
  }

  try {
    const token = window.localStorage.getItem(TOKEN_KEY) || '';
    const rawUser = window.localStorage.getItem(USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { token, user };
  } catch {
    return { token: '', user: null };
  }
};

export const saveSession = (token, user) => {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const toTagsArray = (tags) =>
  tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

// API base URL
const API_BASE = '/api/v1';

// Helper function for making authenticated requests
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: (token, refreshToken) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ token, refreshToken }) }),
  refreshToken: (refreshToken) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  verifyToken: (token) => request('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
};

// Notes API - matches useNotes hook expectations
export const notesApi = {
  getNotes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notes${query ? `?${query}` : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  searchNotes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notes/search?${query}`);
  },
  bulkAction: (data) => request('/notes/bulk', { method: 'POST', body: JSON.stringify(data) }),
};

// Profile/User API - matches useProfile hook expectations (exported as usersApi)
export const usersApi = {
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// Also export as userApi for consistency
export const userApi = {
  get: (id) => request(`/users/${id}`),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
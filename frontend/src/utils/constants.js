/**
 * Application constants
 */

export const viewOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All notes' },
];

export const TOKEN_KEY = 'notely.token';
export const USER_KEY = 'notely.user';
export const REFRESH_TOKEN_KEY = 'notely.refreshToken';

export const API_BASE = '/api/v1';

export const sortNotes = (notes) =>
  [...notes].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }
    return new Date(right.createdAt) - new Date(left.createdAt);
  });

export const formatDate = (value) => {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};
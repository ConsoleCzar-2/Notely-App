const TOKEN_KEY = 'notely.token';
const USER_KEY = 'notely.user';

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
};

export const toTagsArray = (tags) =>
  tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export const formatDate = (value) => {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

export const request = async (path, options = {}) => {
  const { token, body, method = 'GET' } = options;
  const headers = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(path, {
    method,
    headers,
    body: payload,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};
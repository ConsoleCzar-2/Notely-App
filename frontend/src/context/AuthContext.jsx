/**
 * Auth Context - Global authentication state management
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'notely.token';
const USER_KEY = 'notely.user';
const REFRESH_TOKEN_KEY = 'notely.refreshToken';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Save auth state to localStorage
  const saveAuth = useCallback((newToken, newRefreshToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    if (newRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
  }, []);

  // Clear auth state
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  // Register new user
  const register = useCallback(async ({ email, username, password }) => {
    setError(null);
    try {
      const response = await authApi.register({ email, username, password });
      const { token, refreshToken: newRefreshToken, user } = response.data;
      saveAuth(token, newRefreshToken, user);
      return { success: true, user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [saveAuth]);

  // Login user
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      const { token, refreshToken: newRefreshToken, user } = response.data;
      saveAuth(token, newRefreshToken, user);
      return { success: true, user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [saveAuth]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      if (token && refreshToken) {
        await authApi.logout(token, refreshToken);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
    }
  }, [token, refreshToken, clearAuth]);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;
    
    try {
      const response = await authApi.refreshToken(refreshToken);
      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      saveAuth(newToken, newRefreshToken, user);
      return newToken;
    } catch (err) {
      console.error('Token refresh failed:', err);
      clearAuth();
      return null;
    }
  }, [refreshToken, user, saveAuth, clearAuth]);

  // Verify current token
  const verifyToken = useCallback(async () => {
    if (!token) return false;
    
    try {
      const response = await authApi.verifyToken(token);
      return response.data.valid;
    } catch (err) {
      console.error('Token verification failed:', err);
      return false;
    }
  }, [token]);

  // Update user profile
  const updateUser = useCallback((userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(() => ({
    user,
    token,
    refreshToken,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    register,
    login,
    logout,
    refreshAccessToken,
    verifyToken,
    updateUser,
    clearError,
  }), [user, token, refreshToken, loading, error, register, login, logout, refreshAccessToken, verifyToken, updateUser, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
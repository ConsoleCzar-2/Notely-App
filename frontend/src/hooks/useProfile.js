/**
 * Custom hook for managing user profile data
 */

import { useState, useCallback, useEffect } from 'react';
import { usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

export const useProfile = () => {
  const { token, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await usersApi.getProfile(token);
      const profileData = response.data;
      setProfile(profileData);
      return profileData;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch profile when token changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (profileData) => {
    if (!token) throw new Error('Not authenticated');
    
    setError(null);
    try {
      const response = await usersApi.updateProfile(profileData, token);
      const updatedProfile = response.data;
      setProfile(updatedProfile);
      
      // Also update user in auth context if fullName changed
      if (profileData.fullName && user) {
        updateUser({ username: profileData.fullName });
      }
      
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token, user, updateUser]);

  const clearError = useCallback(() => setError(null), []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    clearError,
  };
};

export default useProfile;
/**
 * Custom hook for managing notes data
 */

import { useState, useCallback, useEffect } from 'react';
import { notesApi } from '../api';
import { useAuth } from '../context/AuthContext';

export const useNotes = (initialParams = {}) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    archived: false,
    ...initialParams,
  });

  const fetchNotes = useCallback(async (fetchParams = params) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await notesApi.getNotes(fetchParams, token);
      const data = response.data || [];
      const pag = response.pagination || {};
      
      setNotes(data);
      setPagination({
        page: pag.page || 1,
        limit: pag.limit || 20,
        total: pag.total || 0,
        totalPages: pag.totalPages || 0,
      });
    } catch (err) {
      setError(err.message);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [token, params]);

  // Fetch notes when params or token changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (noteData) => {
    if (!token) throw new Error('Not authenticated');
    
    setError(null);
    try {
      const response = await notesApi.createNote(noteData, token);
      const newNote = response.data;
      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token]);

  const updateNote = useCallback(async (id, noteData) => {
    if (!token) throw new Error('Not authenticated');
    
    setError(null);
    try {
      const response = await notesApi.updateNote(id, noteData, token);
      const updatedNote = response.data;
      setNotes(prev => prev.map(note => note._id === id ? updatedNote : note));
      return updatedNote;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token]);

  const deleteNote = useCallback(async (id) => {
    if (!token) throw new Error('Not authenticated');
    
    setError(null);
    try {
      await notesApi.deleteNote(id, token);
      setNotes(prev => prev.filter(note => note._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token]);

  const searchNotes = useCallback(async (query, searchParams = {}) => {
    if (!token) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await notesApi.searchNotes({ query, ...searchParams }, token);
      return response.data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const bulkAction = useCallback(async (noteIds, action) => {
    if (!token) throw new Error('Not authenticated');
    
    setError(null);
    try {
      const response = await notesApi.bulkAction({ noteIds, action }, token);
      
      // Refresh notes after bulk action
      await fetchNotes(params);
      
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token, fetchNotes, params]);

  const setPage = useCallback((page) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit) => {
    setParams(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const setArchived = useCallback((archived) => {
    setParams(prev => ({ ...prev, archived, page: 1 }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    notes,
    loading,
    error,
    pagination,
    params,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    bulkAction,
    setPage,
    setLimit,
    setArchived,
    clearError,
  };
};

export default useNotes;
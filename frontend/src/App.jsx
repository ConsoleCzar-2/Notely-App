import { useEffect, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useNotes } from './hooks/useNotes';
import { useProfile } from './hooks/useProfile';
import { AuthPanel } from './components/AuthPanel';
import { NotesList } from './components/NotesList';
import { NoteEditor } from './components/NoteEditor';
import { ProfilePanel } from './components/ProfilePanel';
import { formatDate, sortNotes } from './utils/constants';
import './styles.css';

// Inner App component that has access to Auth context
const AppInner = () => {
  const { 
    user, 
    token, 
    loading: authLoading, 
    isAuthenticated,
    logout,
    updateUser 
  } = useAuth();

  const {
    notes,
    loading: notesLoading,
    error: notesError,
    pagination,
    params,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    bulkAction,
    setPage,
    setArchived,
    clearError: clearNotesError,
  } = useNotes({ archived: false });

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    fetchProfile,
    updateProfile,
    clearError: clearProfileError,
  } = useProfile();

  const [mode, setMode] = useState('dashboard'); // 'dashboard' | 'login'
  const [selectedId, setSelectedId] = useState(null);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [view, setView] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentNote = notes.find((note) => note._id === selectedId) || null;

  const stats = {
    total: notes.length,
    pinned: notes.filter((note) => note.isPinned).length,
    archived: notes.filter((note) => note.isArchived).length,
    active: notes.filter((note) => !note.isArchived).length,
  };

  const showError = useCallback((message) => {
    setNotice({ type: 'error', text: message });
  }, []);

  const showSuccess = useCallback((text) => {
    setNotice({ type: 'success', text });
  }, []);

  // Initialize dashboard when token changes
  useEffect(() => {
    if (!token) {
      setMode('login');
      return;
    }
    setMode('dashboard');
  }, [token]);

  // Auto-select first note when notes load
  useEffect(() => {
    if (!selectionInitialized && notes.length > 0 && !selectedId) {
      setSelectedId(notes[0]._id);
      setSelectionInitialized(true);
    }
  }, [notes, selectionInitialized, selectedId]);

  // Reset selection if selected note is no longer in list
  useEffect(() => {
    if (selectedId && !notes.some((note) => note._id === selectedId)) {
      setSelectedId(notes[0]?._id || null);
      setSelectionInitialized(false);
    }
  }, [notes, selectedId]);

  const loadDashboard = useCallback(async (nextView = view, nextSearch = searchTerm) => {
    if (!token) return;

    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) {
      try {
        const searchResults = await searchNotes(trimmedSearch, { page: 1, limit: 50 });
        const sorted = sortNotes(searchResults);
        // Notes are updated via useNotes hook
        if (sorted.length && !selectionInitialized) {
          setSelectedId(sorted[0]._id);
          setSelectionInitialized(true);
        }
      } catch (err) {
        showError(err.message);
      }
      return;
    }

    // Update view params
    if (nextView === 'active') {
      setArchived(false);
    } else if (nextView === 'archived') {
      setArchived(true);
    } else {
      // For 'all' view, we'll fetch both and combine
      // This is handled by the useNotes hook with archived: undefined
    }
  }, [token, view, searchTerm, searchNotes, setArchived, selectionInitialized, showError]);

  const handleViewChange = useCallback(async (nextView) => {
    setView(nextView);
    setSearchTerm('');
    setSearchDraft('');
    await loadDashboard(nextView, '');
  }, [loadDashboard]);

  const handleSearchSubmit = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    setSearchTerm(trimmed);
    await loadDashboard(view, trimmed);
  }, [searchDraft, loadDashboard, view]);

  const handleClearSearch = useCallback(async () => {
    setSearchDraft('');
    setSearchTerm('');
    await loadDashboard(view, '');
  }, [loadDashboard, view]);

  const handleNoteSave = useCallback(async (noteIdOrData, data) => {
    if (!token) return;

    setSubmitting(true);
    try {
      if (noteIdOrData && typeof noteIdOrData === 'object' && noteIdOrData._id) {
        // Update existing note
        await updateNote(noteIdOrData._id, data);
        showSuccess('Note updated.');
      } else {
        // Create new note
        await createNote(data);
        showSuccess('Note created.');
      }
      setSearchTerm('');
      setSearchDraft('');
      await loadDashboard('all', '');
      setView('all');
    } catch (error) {
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [token, createNote, updateNote, loadDashboard, showSuccess, showError]);

  const handleUpdateNoteFlags = useCallback(async (note, patch) => {
    if (!token) return;

    setSubmitting(true);
    try {
      await updateNote(note._id, {
        title: note.title,
        content: note.content,
        tags: Array.isArray(note.tags) ? note.tags : [],
        isPinned: patch.isPinned ?? note.isPinned,
        isArchived: patch.isArchived ?? note.isArchived,
      });
      showSuccess('Note updated.');
      await loadDashboard();
    } catch (error) {
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [token, updateNote, loadDashboard, showSuccess, showError]);

  const handleDeleteNote = useCallback(async (note) => {
    if (!token) return;

    const confirmed = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await deleteNote(note._id);
      if (selectedId === note._id) {
        setSelectedId(null);
      }
      showSuccess('Note deleted.');
      await loadDashboard();
    } catch (error) {
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [token, deleteNote, selectedId, loadDashboard, showSuccess, showError]);

  const handleProfileSave = useCallback(async (profileData) => {
    if (!token) return;

    setSubmitting(true);
    try {
      const updatedProfile = await updateProfile(profileData);
      if (profileData.fullName && user) {
        updateUser({ username: profileData.fullName });
      }
      showSuccess('Profile updated.');
    } catch (error) {
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [token, updateProfile, user, updateUser, showSuccess, showError]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    showSuccess('Logged out.');
  }, [logout, showSuccess]);

  // Render loading state
  if (authLoading) {
    return (
      <div className="shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <main className="layout">
          <div className="panel loading-panel">
            <p>Loading your workspace...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render login/register
  if (!isAuthenticated) {
    return (
      <div className="shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />

        <header className="hero">
          <div>
            <p className="eyebrow">Notely</p>
            <h1>Notes and profiles in one clean dashboard.</h1>
            <p className="hero-copy">
              Your one-stop solution for all note-taking needs.
            </p>
          </div>
          <div className="hero-side hero-art-wrap" aria-hidden="true">
            <img className="hero-art" src="/note-image.png" alt="" />
          </div>
        </header>

        <main className="layout">
          <section className="content-stack">
            <AuthPanel />
          </section>
        </main>
      </div>
    );
  }

  // Render dashboard
  return (
    <div className="shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="hero">
        <div>
          <p className="eyebrow">Notely</p>
          <h1>Notes and profiles in one clean dashboard.</h1>
          <p className="hero-copy">
            Your one-stop solution for all note-taking needs.
          </p>
        </div>
        <div className="hero-side hero-art-wrap" aria-hidden="true">
          <img className="hero-art" src="/note-image.png" alt="" />
        </div>
      </header>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="icon-button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main className="layout">
        <section className="content-stack">
          <div className="panel metrics-panel">
            <div className="panel-header">
              <div>
                <span className="section-label">Overview</span>
                <h2>Your workspace</h2>
              </div>
              <button type="button" className="ghost-button danger" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <div className="metrics-grid">
              <div className="metric-card"><strong>Total notes: {stats.total}</strong></div>
              <div className="metric-card"><strong>Pinned: {stats.pinned}</strong></div>
              <div className="metric-card"><strong>Active: {stats.active}</strong></div>
              <div className="metric-card"><strong>Archived: {stats.archived}</strong></div>
            </div>
          </div>

          <NotesList
            notes={notes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPin={(note, isPinned) => handleUpdateNoteFlags(note, { isPinned })}
            onArchive={(note, isArchived) => handleUpdateNoteFlags(note, { isArchived })}
            onDelete={handleDeleteNote}
            view={view}
            onViewChange={handleViewChange}
            searchTerm={searchTerm}
            onSearch={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            loading={notesLoading}
            disabled={submitting}
          />

          <NoteEditor
            currentNote={currentNote}
            onSave={handleNoteSave}
            onNew={() => {
              setSelectedId(null);
              setSelectionInitialized(false);
            }}
            onPin={(note, isPinned) => handleUpdateNoteFlags(note, { isPinned })}
            onArchive={(note, isArchived) => handleUpdateNoteFlags(note, { isArchived })}
            onDelete={handleDeleteNote}
            submitting={submitting}
            disabled={submitting}
          />
        </section>

        <aside className="sidebar">
          <ProfilePanel
            profile={profile}
            onUpdateProfile={handleProfileSave}
            submitting={submitting}
            disabled={submitting}
          />
        </aside>
      </main>
    </div>
  );
};

// Main App wrapper with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
};

export default App;
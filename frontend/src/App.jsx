import { useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  formatDate,
  request,
  restoreSession,
  saveSession,
  toTagsArray,
} from './api';

const emptyAuth = {
  email: '',
  username: '',
  password: '',
};

const emptyNote = {
  title: '',
  content: '',
  tags: '',
};

const emptyProfile = {
  fullName: '',
  bio: '',
  avatarUrl: '',
};

const viewOptions = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All notes' },
];

const sortNotes = (notes) =>
  [...notes].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.createdAt) - new Date(left.createdAt);
  });

const notePreview = (content) => {
  if (!content) return 'No preview available yet.';
  return content.length > 160 ? `${content.slice(0, 160)}...` : content;
};

function App() {
  const storedSession = restoreSession();
  const [mode, setMode] = useState(storedSession.token ? 'dashboard' : 'login');
  const [authForm, setAuthForm] = useState(emptyAuth);
  const [token, setToken] = useState(storedSession.token);
  const [session, setSession] = useState(storedSession.user);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [view, setView] = useState('active');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(Boolean(storedSession.token));
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const currentNote = useMemo(
    () => notes.find((note) => note._id === selectedId) || null,
    [notes, selectedId]
  );

  const avatarSrc = profile?.avatarUrl?.trim() || '';

  const stats = useMemo(() => {
    const pinned = notes.filter((note) => note.isPinned).length;
    const archived = notes.filter((note) => note.isArchived).length;
    return {
      total: notes.length,
      pinned,
      archived,
      active: Math.max(notes.length - archived, 0),
    };
  }, [notes]);

  const showError = (error) => {
    setNotice({ type: 'error', text: error.message || 'Something went wrong' });
  };

  const showSuccess = (text) => {
    setNotice({ type: 'success', text });
  };

  const loadDashboard = async (nextView = view, nextSearch = searchTerm) => {
    if (!token) return;

    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) {
      const response = await request(
        `/api/notes/search?query=${encodeURIComponent(trimmedSearch)}&page=1&limit=50`,
        { token }
      );
      const searchNotes = sortNotes(response.data || []);
      setNotes(searchNotes);
      if (searchNotes.length && !selectionInitialized) {
        setSelectedId(searchNotes[0]._id);
        setSelectionInitialized(true);
      }
      return;
    }

    const loadActive = async () => {
      const response = await request('/api/notes?page=1&limit=50&archived=false', { token });
      return response.data || [];
    };

    const loadArchived = async () => {
      const response = await request('/api/notes?page=1&limit=50&archived=true', { token });
      return response.data || [];
    };

    let combined = [];
    if (nextView === 'active') {
      combined = await loadActive();
    } else if (nextView === 'archived') {
      combined = await loadArchived();
    } else {
      const [activeNotes, archivedNotes] = await Promise.all([loadActive(), loadArchived()]);
      combined = [...activeNotes, ...archivedNotes];
    }

    const sorted = sortNotes(combined);
    setNotes(sorted);

    if (!selectionInitialized && sorted.length) {
      setSelectedId(sorted[0]._id);
      setSelectionInitialized(true);
      return;
    }

    if (selectedId && !sorted.some((note) => note._id === selectedId)) {
      setSelectedId(sorted[0]?._id || null);
    }
  };

  const bootstrap = async (currentToken) => {
    setLoading(true);
    try {
      const [me, profileResponse] = await Promise.all([
        request('/api/auth/me', { token: currentToken }),
        request('/api/users/profile', { token: currentToken }),
      ]);

      const nextUser = me.data || null;
      setSession(nextUser);
      saveSession(currentToken, nextUser);

      const profileData = profileResponse.data || {};
      setProfile(profileData);
      setProfileForm({
        fullName: profileData.fullName || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatarUrl || '',
      });

      await loadDashboard();
      setMode('dashboard');
      showSuccess('Session restored successfully.');
    } catch (error) {
      clearSession();
      setToken('');
      setSession(null);
      setProfile(null);
      setProfileForm(emptyProfile);
      setNotes([]);
      setSelectedId(null);
      setSearchTerm('');
      setSearchDraft('');
      setMode('login');
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setMode('login');
      return;
    }

    void bootstrap(token);
  }, [token]);

  useEffect(() => {
    if (!currentNote) {
      setNoteForm(emptyNote);
      return;
    }

    setNoteForm({
      title: currentNote.title || '',
      content: currentNote.content || '',
      tags: Array.isArray(currentNote.tags) ? currentNote.tags.join(', ') : '',
    });
  }, [currentNote]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await request(endpoint, {
        method: 'POST',
        body: payload,
      });

      const nextToken = response.data?.token;
      const nextUser = response.data?.user || null;

      if (!nextToken) {
        throw new Error('Authentication response did not include a token.');
      }

      setToken(nextToken);
      setSession(nextUser);
      saveSession(nextToken, nextUser);
      setMode('dashboard');
      setAuthForm(emptyAuth);
      showSuccess(mode === 'register' ? 'Account created successfully.' : 'Logged in successfully.');
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await request('/api/auth/logout', { method: 'POST', token });
    } catch {
      // Logging out locally should still succeed even if the gateway is unavailable.
    }

    clearSession();
    setToken('');
    setSession(null);
    setProfile(null);
    setProfileForm(emptyProfile);
    setNotes([]);
    setSelectedId(null);
    setSelectionInitialized(false);
    setSearchTerm('');
    setSearchDraft('');
    setMode('login');
    showSuccess('Logged out.');
  };

  const refreshNotes = async (nextView = view, nextSearch = searchTerm) => {
    if (!token) return;
    await loadDashboard(nextView, nextSearch);
  };

  const handleViewChange = async (nextView) => {
    setView(nextView);
    setSearchTerm('');
    setSearchDraft('');
    await refreshNotes(nextView, '');
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    setSearchTerm(trimmed);
    await refreshNotes(view, trimmed);
  };

  const handleClearSearch = async () => {
    setSearchDraft('');
    setSearchTerm('');
    await refreshNotes(view, '');
  };

  const handleNoteSave = async (event) => {
    event.preventDefault();
    if (!token) return;

    const payload = {
      title: noteForm.title,
      content: noteForm.content,
      tags: toTagsArray(noteForm.tags),
    };

    setSubmitting(true);
    try {
      if (currentNote) {
        await request(`/api/notes/${currentNote._id}`, {
          method: 'PUT',
          token,
          body: {
            ...payload,
            isPinned: currentNote.isPinned,
            isArchived: currentNote.isArchived,
          },
        });
        showSuccess('Note updated.');
      } else {
        const response = await request('/api/notes', {
          method: 'POST',
          token,
          body: payload,
        });

        setSelectedId(response.data?._id || null);
        showSuccess('Note created.');
      }

      setSearchTerm('');
      setSearchDraft('');
      await refreshNotes('all', '');
      setView('all');
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateNoteFlags = async (note, patch) => {
    setSubmitting(true);
    try {
      await request(`/api/notes/${note._id}`, {
        method: 'PUT',
        token,
        body: {
          title: note.title,
          content: note.content,
          tags: Array.isArray(note.tags) ? note.tags : [],
          isPinned: patch.isPinned ?? note.isPinned,
          isArchived: patch.isArchived ?? note.isArchived,
        },
      });
      showSuccess('Note updated.');
      await refreshNotes();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (note) => {
    const confirmed = window.confirm(`Delete \"${note.title}\"? This cannot be undone.`);
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await request(`/api/notes/${note._id}`, {
        method: 'DELETE',
        token,
      });
      if (selectedId === note._id) {
        setSelectedId(null);
      }
      showSuccess('Note deleted.');
      await refreshNotes();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await request('/api/users/profile', {
        method: 'PUT',
        token,
        body: {
          fullName: profileForm.fullName,
          bio: profileForm.bio,
          avatarUrl: profileForm.avatarUrl,
        },
      });

      setProfile(response.data || null);
      showSuccess('Profile updated.');
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = [
    { label: 'Total notes', value: stats.total },
    { label: 'Pinned', value: stats.pinned },
    { label: 'Active', value: stats.active },
    { label: 'Archived', value: stats.archived },
  ];

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
          {!token ? (
            <div className="panel auth-panel">
              <div className="panel-header auth-header">
                <div>
                  <span className="section-label">Access</span>
                  <h2>{mode === 'register' ? 'Create an account' : 'Welcome back'}</h2>
                </div>
                <div className="switcher">
                  <button
                    type="button"
                    className={mode === 'login' ? 'switch active' : 'switch'}
                    onClick={() => setMode('login')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={mode === 'register' ? 'switch active' : 'switch'}
                    onClick={() => setMode('register')}
                  >
                    Register
                  </button>
                </div>
              </div>

              <form className="form-grid" onSubmit={handleAuthSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                    placeholder="you@example.com"
                  />
                </label>

                {mode === 'register' && (
                  <label>
                    <span>Username</span>
                    <input
                      type="text"
                      required
                      value={authForm.username}
                      onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                      placeholder="your-handle"
                    />
                  </label>
                )}

                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authForm.password}
                    onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                    placeholder="8+ characters"
                  />
                </label>

                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? 'Working...' : mode === 'register' ? 'Create account' : 'Login'}
                </button>
              </form>
            </div>
          ) : loading ? (
            <div className="panel loading-panel">
              <p>Loading your workspace...</p>
            </div>
          ) : (
            <>
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
                  {metrics.map((metric) => (
                    <div className="metric-card" key={metric.label}>
                      <strong>{metric.label}: {metric.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-label">Browse</span>
                    <h2>Notes and filters</h2>
                  </div>
                  <div className="switcher">
                    {viewOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={view === option.value && !searchTerm ? 'switch active' : 'switch'}
                        onClick={() => void handleViewChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="search-row" onSubmit={handleSearchSubmit}>
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Search titles, content, and tags"
                  />
                  <button type="submit" className="primary-button">
                    Search
                  </button>
                  {searchTerm && (
                    <button type="button" className="ghost-button" onClick={() => void handleClearSearch()}>
                      Clear
                    </button>
                  )}
                </form>

                <div className="notes-list">
                  {notes.length === 0 ? (
                    <div className="empty-state">
                      <h3>No notes yet.</h3>
                      <p>Create your first note to start organizing ideas, study material, or tasks.</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <button
                        key={note._id}
                        type="button"
                        className={note._id === selectedId ? 'note-card active' : 'note-card'}
                        onClick={() => setSelectedId(note._id)}
                      >
                        <div className="note-card-head">
                          <strong>{note.title}</strong>
                          <div className="note-badges">
                            {note.isPinned && <span className="pill pill-accent">Pinned</span>}
                            {note.isArchived && <span className="pill pill-danger">Archived</span>}
                          </div>
                        </div>
                        <p>{notePreview(note.content)}</p>
                        <div className="note-footer">
                          <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                          <span>{Array.isArray(note.tags) ? note.tags.join(' • ') : ''}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="panel editor-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-label">Editor</span>
                    <h2>{currentNote ? 'Edit selected note' : 'Create a new note'}</h2>
                  </div>
                  <div className="editor-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setSelectedId(null);
                        setNoteForm(emptyNote);
                      }}
                    >
                      New note
                    </button>
                    {currentNote && (
                      <>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => void updateNoteFlags(currentNote, { isPinned: !currentNote.isPinned })}
                          disabled={submitting}
                        >
                          {currentNote.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => void updateNoteFlags(currentNote, { isArchived: !currentNote.isArchived })}
                          disabled={submitting}
                        >
                          {currentNote.isArchived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button danger"
                          onClick={() => void handleDeleteNote(currentNote)}
                          disabled={submitting}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <form className="editor-form" onSubmit={handleNoteSave}>
                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      required
                      value={noteForm.title}
                      onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })}
                      placeholder="Study plan, meeting notes, quick idea..."
                    />
                  </label>

                  <label>
                    <span>Content</span>
                    <textarea
                      required
                      rows={10}
                      value={noteForm.content}
                      onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })}
                      placeholder="Capture the idea, add checklists, or draft the next step."
                    />
                  </label>

                  <label>
                    <span>Tags</span>
                    <input
                      type="text"
                      value={noteForm.tags}
                      onChange={(event) => setNoteForm({ ...noteForm, tags: event.target.value })}
                      placeholder="study, project, ideas"
                    />
                  </label>

                  <button type="submit" className="primary-button" disabled={submitting}>
                    {submitting ? 'Saving...' : currentNote ? 'Update note' : 'Create note'}
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

        <aside className="sidebar">
          <div className="panel profile-panel">
            <div className="panel-header">
              <div>
                <span className="section-label">Profile</span>
                <h2>User details</h2>
              </div>
            </div>

            <div className="profile-summary">
              {avatarSrc ? (
                <img
                  className="avatar avatar-image"
                  src={avatarSrc}
                  alt={`${session?.username || 'User'} avatar`}
                />
              ) : (
                <div className="avatar">{session?.username?.slice(0, 1)?.toUpperCase() || 'N'}</div>
              )}
              <div>
                <strong>{session?.username || 'Guest'}</strong>
                <p>{session?.email || 'Sign in to manage your profile.'}</p>
              </div>
            </div>

            <form className="form-grid profile-form" onSubmit={handleProfileSave}>
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
                  placeholder="Your display name"
                />
              </label>

              <label>
                <span>Avatar URL</span>
                <input
                  type="url"
                  value={profileForm.avatarUrl}
                  onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>Bio</span>
                <textarea
                  rows={5}
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                  placeholder="A short intro for your note workspace"
                />
              </label>

              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="section-label">Current profile</span>
                <h2>Stored user data</h2>
              </div>
            </div>
            <div className="detail-list">
              <div>
                <span>Full name</span>
                <strong>{profile?.fullName || 'Not set yet'}</strong>
              </div>
              <div>
                <span>Bio</span>
                <strong>{profile?.bio || 'No bio yet'}</strong>
              </div>
              <div>
                <span>Avatar</span>
                {avatarSrc ? (
                  <img className="avatar-preview" src={avatarSrc} alt="Stored profile avatar" />
                ) : (
                  <strong>No avatar stored</strong>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
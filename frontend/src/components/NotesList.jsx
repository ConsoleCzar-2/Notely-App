/**
 * Notes List Component
 */

import { useState, useCallback } from 'react';
import { NoteCard } from './NoteCard';
import { viewOptions } from '../utils/constants';

export const NotesList = ({ 
  notes, 
  selectedId, 
  onSelect, 
  onPin, 
  onArchive, 
  onDelete, 
  view, 
  onViewChange,
  searchTerm,
  onSearch,
  onClearSearch,
  loading,
  disabled 
}) => {
  const [searchDraft, setSearchDraft] = useState(searchTerm || '');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchDraft.trim());
  };

  const filteredNotes = notes;

  return (
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
              onClick={() => onViewChange(option.value)}
              disabled={disabled}
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
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search titles, content, and tags"
          disabled={disabled}
        />
        <button type="submit" className="primary-button" disabled={disabled}>
          Search
        </button>
        {searchTerm && (
          <button type="button" className="ghost-button" onClick={onClearSearch} disabled={disabled}>
            Clear
          </button>
        )}
      </form>

      <div className="notes-list">
        {loading ? (
          <div className="loading-state">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <h3>No notes yet.</h3>
            <p>Create your first note to start organizing ideas, study material, or tasks.</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              isSelected={note._id === selectedId}
              onClick={onSelect}
              onPin={onPin}
              onArchive={onArchive}
              onDelete={onDelete}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotesList;
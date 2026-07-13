/**
 * Note Card Component
 */

import { formatDate } from '../utils/constants';

export const NoteCard = ({ note, isSelected, onClick, onPin, onArchive, onDelete, disabled }) => {
  return (
    <button
      type="button"
      className={`note-card ${isSelected ? 'active' : ''}`}
      onClick={() => onClick(note._id)}
      disabled={disabled}
    >
      <div className="note-card-head">
        <strong>{note.title}</strong>
        <div className="note-badges">
          {note.isPinned && <span className="pill pill-accent">Pinned</span>}
          {note.isArchived && <span className="pill pill-danger">Archived</span>}
        </div>
      </div>
      <p>{note.content ? note.content.slice(0, 160) + (note.content.length > 160 ? '...' : '') : 'No preview available'}</p>
      <div className="note-footer">
        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
        <span>{Array.isArray(note.tags) ? note.tags.join(' • ') : ''}</span>
      </div>
    </button>
  );
};

export default NoteCard;
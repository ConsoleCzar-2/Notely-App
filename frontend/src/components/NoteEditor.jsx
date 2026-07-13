/**
 * Note Editor Component
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm } from '../hooks/useForm';
import { toTagsArray } from '../api';

const emptyNote = {
  title: '',
  content: '',
  tags: '',
};

const validateNote = (values) => {
  const errors = {};
  if (!values.title || !values.title.trim()) {
    errors.title = 'Title is required';
  } else if (values.title.length > 200) {
    errors.title = 'Title must be at most 200 characters';
  }
  if (!values.content || !values.content.trim()) {
    errors.content = 'Content is required';
  } else if (values.content.length > 50000) {
    errors.content = 'Content must be at most 50,000 characters';
  }
  return errors;
};

export const NoteEditor = ({ 
  currentNote, 
  onSave, 
  onNew, 
  onPin, 
  onArchive, 
  onDelete, 
  submitting,
  disabled 
}) => {
  const initialValues = useMemo(() => currentNote ? {
    title: currentNote.title || '',
    content: currentNote.content || '',
    tags: Array.isArray(currentNote.tags) ? currentNote.tags.join(', ') : '',
  } : emptyNote, [currentNote]);

  const { values, errors, handleChange, handleBlur, handleSubmit, resetForm } = useForm(
    initialValues,
    validateNote
  );

  // Reset form when currentNote changes
  useEffect(() => {
    resetForm(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNote]);

  const onSubmit = async (formValues) => {
    const payload = {
      title: formValues.title,
      content: formValues.content,
      tags: toTagsArray(formValues.tags),
    };

    if (currentNote) {
      await onSave(currentNote._id, {
        ...payload,
        isPinned: currentNote.isPinned,
        isArchived: currentNote.isArchived,
      });
    } else {
      await onSave(payload);
    }
  };

  return (
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
            onClick={onNew}
            disabled={disabled || submitting}
          >
            New note
          </button>
          {currentNote && (
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onPin(currentNote, !currentNote.isPinned)}
                disabled={disabled || submitting}
              >
                {currentNote.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onArchive(currentNote, !currentNote.isArchived)}
                disabled={disabled || submitting}
              >
                {currentNote.isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                type="button"
                className="ghost-button danger"
                onClick={() => onDelete(currentNote)}
                disabled={disabled || submitting}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <form className="editor-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="note-title">Title</label>
          <input
            id="note-title"
            name="title"
            type="text"
            required
            maxLength={200}
            value={values.title}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Study plan, meeting notes, quick idea..."
            disabled={disabled || submitting}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && <span id="title-error" className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="note-content">Content</label>
          <textarea
            id="note-content"
            name="content"
            required
            rows={12}
            value={values.content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Capture the idea, add checklists, or draft the next step."
            disabled={disabled || submitting}
            aria-invalid={!!errors.content}
            aria-describedby={errors.content ? 'content-error' : undefined}
          />
          {errors.content && <span id="content-error" className="error-message">{errors.content}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="note-tags">Tags</label>
          <input
            id="note-tags"
            name="tags"
            type="text"
            value={values.tags}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="study, project, ideas"
            disabled={disabled || submitting}
          />
          <small className="form-hint">Separate tags with commas</small>
        </div>

        <button type="submit" className="primary-button" disabled={disabled || submitting}>
          {submitting ? 'Saving...' : currentNote ? 'Update note' : 'Create note'}
        </button>
      </form>
    </div>
  );
};

export default NoteEditor;
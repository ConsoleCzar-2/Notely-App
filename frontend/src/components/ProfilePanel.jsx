/**
 * Profile Panel Component
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm } from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';

const emptyProfile = {
  fullName: '',
  bio: '',
  avatarUrl: '',
};

const validateProfile = (values) => {
  const errors = {};
  if (values.fullName && values.fullName.length > 255) {
    errors.fullName = 'Full name must be at most 255 characters';
  }
  if (values.bio && values.bio.length > 1000) {
    errors.bio = 'Bio must be at most 1000 characters';
  }
  if (values.avatarUrl && values.avatarUrl.length > 500) {
    errors.avatarUrl = 'Avatar URL must be at most 500 characters';
  }
  if (values.avatarUrl && !/^https?:\/\/.+/.test(values.avatarUrl)) {
    errors.avatarUrl = 'Avatar URL must be a valid HTTP/HTTPS URL';
  }
  return errors;
};

export const ProfilePanel = ({ profile, onUpdateProfile, submitting, disabled }) => {
  const { user, updateUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(null);

  const initialValues = useMemo(() => profile ? {
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    avatarUrl: profile.avatarUrl || '',
  } : emptyProfile, [profile]);

  const { values, errors, handleChange, handleBlur, handleSubmit, resetForm } = useForm(
    initialValues,
    validateProfile
  );

  // Update avatar preview when URL changes
  useEffect(() => {
    if (values.avatarUrl) {
      setAvatarPreview(values.avatarUrl);
    } else {
      setAvatarPreview(null);
    }
  }, [values.avatarUrl]);

  // Reset form when profile data changes
  useEffect(() => {
    if (profile) {
      resetForm(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const onSubmit = async (formValues) => {
    await onUpdateProfile(formValues);
  };

  const displayName = user?.username || 'Guest';
  const displayEmail = user?.email || 'Sign in to manage your profile.';
  const avatarSrc = values.avatarUrl?.trim() || avatarPreview;

  return (
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
            alt={`${displayName} avatar`}
            onError={(e) => { e.target.style.display = 'none'; setAvatarPreview(null); }}
          />
        ) : (
          <div className="avatar">{displayName.slice(0, 1).toUpperCase() || 'N'}</div>
        )}
        <div>
          <strong>{displayName}</strong>
          <p>{displayEmail}</p>
        </div>
      </div>

      <form className="form-grid profile-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={values.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Your display name"
            maxLength={255}
            disabled={disabled || submitting}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
          {errors.fullName && <span id="fullName-error" className="error-message">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="avatarUrl">Avatar URL</label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            value={values.avatarUrl}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="https://..."
            maxLength={500}
            disabled={disabled || submitting}
            aria-invalid={!!errors.avatarUrl}
            aria-describedby={errors.avatarUrl ? 'avatarUrl-error' : undefined}
          />
          {errors.avatarUrl && <span id="avatarUrl-error" className="error-message">{errors.avatarUrl}</span>}
          {avatarPreview && (
            <div className="avatar-preview-wrapper">
              <img 
                className="avatar-preview" 
                src={avatarPreview} 
                alt="Avatar preview" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            value={values.bio}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="A short intro for your note workspace"
            maxLength={1000}
            disabled={disabled || submitting}
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
          />
          {errors.bio && <span id="bio-error" className="error-message">{errors.bio}</span>}
        </div>

        <button type="submit" className="primary-button" disabled={disabled || submitting}>
          {submitting ? 'Saving...' : 'Save profile'}
        </button>
      </form>

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
            {profile?.avatarUrl ? (
              <img className="avatar-preview" src={profile.avatarUrl} alt="Stored profile avatar" />
            ) : (
              <strong>No avatar stored</strong>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
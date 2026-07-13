/**
 * Register Form Component
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';

const validateRegister = (values) => {
  const errors = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Email is invalid';
  }
  if (!values.username) {
    errors.username = 'Username is required';
  } else if (values.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (values.username.length > 30) {
    errors.username = 'Username must be at most 30 characters';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(values.username)) {
    errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (values.password.length > 128) {
    errors.password = 'Password must be at most 128 characters';
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

export const RegisterForm = ({ onSwitchToLogin }) => {
  const { register, error: authError, loading } = useAuth();
  const [localError, setLocalError] = useState(null);

  const { values, errors, handleChange, handleBlur, handleSubmit, submitting } = useForm(
    { email: '', username: '', password: '', confirmPassword: '' },
    validateRegister
  );

  const onSubmit = async (formValues) => {
    setLocalError(null);
    const { confirmPassword, ...registerData } = formValues;
    const result = await register(registerData);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const displayError = localError || authError;

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="you@example.com"
          disabled={submitting || loading}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && <span id="email-error" className="error-message">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={30}
          value={values.username}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="your-handle"
          disabled={submitting || loading}
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
        />
        {errors.username && <span id="username-error" className="error-message">{errors.username}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="8+ characters"
          disabled={submitting || loading}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && <span id="password-error" className="error-message">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Confirm password"
          disabled={submitting || loading}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
        />
        {errors.confirmPassword && <span id="confirm-error" className="error-message">{errors.confirmPassword}</span>}
      </div>

      {displayError && (
        <div className="notice notice-error" role="alert">
          {displayError}
        </div>
      )}

      <button type="submit" className="primary-button" disabled={submitting || loading}>
        {submitting || loading ? 'Creating account...' : 'Create account'}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
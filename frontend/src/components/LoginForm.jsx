/**
 * Login Form Component
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';

const validateLogin = (values) => {
  const errors = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Email is invalid';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  }
  return errors;
};

export const LoginForm = ({ onSwitchToRegister }) => {
  const { login, error: authError, loading } = useAuth();
  const [localError, setLocalError] = useState(null);

  const { values, errors, handleChange, handleBlur, handleSubmit, submitting } = useForm(
    { email: '', password: '' },
    validateLogin
  );

  const onSubmit = async (formValues) => {
    setLocalError(null);
    const result = await login(formValues);
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
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
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

      {displayError && (
        <div className="notice notice-error" role="alert">
          {displayError}
        </div>
      )}

      <button type="submit" className="primary-button" disabled={submitting || loading}>
        {submitting || loading ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="auth-switch">
        Don't have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToRegister}>
          Create one
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
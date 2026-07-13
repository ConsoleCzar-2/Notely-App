/**
 * Auth Panel - Switches between Login and Register forms
 */

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPanel = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  return (
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

      {mode === 'login' ? (
        <LoginForm onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
    </div>
  );
};

export default AuthPanel;
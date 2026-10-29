import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Shield,
  User,
  Utensils,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 letters, digits or underscore (_).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    const action = isRegister ? register : login;
    const res = await action(cleanUsername, password);
    setSubmitting(false);

    if (res.success) {
      navigate(nextUrl);
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="auth-shell">
      {/* Editorial side panel */}
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-inner">
          <p className="hero-eyebrow" style={{ marginBottom: 18 }}>
            <span className="live-dot" /> Tablu · Chennai
          </p>
          <p className="auth-quote">
            The best seat in the house,
            <br />
            <em>reserved in seconds.</em>
          </p>
          <ul className="auth-perks">
            <li>
              <CalendarCheck size={16} /> Pick the exact table, not just a time
            </li>
            <li>
              <CheckCircle2 size={16} /> Live availability across every floor
            </li>
            <li>
              <Sparkles size={16} /> Instant confirmation, free cancellation
            </li>
          </ul>
        </div>
      </aside>

      {/* Form */}
      <div style={{ width: '100%' }}>
        <div className="auth-card">
          <div className="auth-head">
            <div className="auth-mark">
              {isRegister ? <UserPlus size={23} /> : <LogIn size={23} />}
            </div>
            <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
            <p>
              {isRegister
                ? 'One account for every table you book.'
                : 'Sign in to reserve tables and manage your plans.'}
            </p>
          </div>

          <div className="segmented" role="group" aria-label="Sign in or register">
            <button
              type="button"
              aria-pressed={!isRegister}
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={isRegister}
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: 18 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="control">
              <label className="control-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                placeholder="e.g. johndoe"
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="control">
              <label className="control-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                placeholder="At least 8 characters"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="demo-box">
            <div className="demo-label">Try a demo account</div>
            <div className="demo-grid">
              <button type="button" className="demo-chip" onClick={() => fillCredentials('guest', 'guest123')}>
                <User size={12} /> guest
              </button>
              <button type="button" className="demo-chip" onClick={() => fillCredentials('priya', 'priya123')}>
                <User size={12} /> priya
              </button>
              <button type="button" className="demo-chip" onClick={() => fillCredentials('rahul', 'rahul123')}>
                <User size={12} /> rahul
              </button>
              <button
                type="button"
                className="demo-chip is-admin"
                onClick={() => fillCredentials('admin', 'admin123')}
              >
                <Shield size={12} /> admin
              </button>
            </div>
          </div>
        </div>

        <div className="auth-foot">
          <Link to="/">
            <Utensils size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            Back to restaurants
          </Link>
        </div>
      </div>
    </div>
  );
};

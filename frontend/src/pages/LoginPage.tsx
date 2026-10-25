import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Shield, User } from 'lucide-react';

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
    <div className="canvas" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1d5fd6, #0a3a80)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(29, 95, 214, 0.25)',
            }}
          >
            {isRegister ? <UserPlus size={26} /> : <LogIn size={26} />}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
            {isRegister ? 'Join Tablu to reserve seats and manage bookings' : 'Log in to continue reserving tables'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '4px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 0,
              borderRadius: '8px',
              background: !isRegister ? 'var(--accent-soft)' : 'transparent',
              color: !isRegister ? 'var(--accent-ink)' : 'var(--muted)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 0,
              borderRadius: '8px',
              background: isRegister ? 'var(--accent-soft)' : 'transparent',
              color: isRegister ? 'var(--accent-ink)' : 'var(--muted)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Auth Form Card */}
        <div className="panel" style={{ padding: '28px', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#ffedea',
                color: '#831c1e',
                border: '1px solid #f0c2bd',
                borderRadius: 'var(--radius-control)',
                fontSize: '13px',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                marginTop: '6px',
              }}
            >
              {submitting ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--rule)' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginBottom: '10px' }}>
              Quick test accounts:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ height: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => fillCredentials('guest', 'guest123')}
              >
                <User size={13} /> guest
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ height: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => fillCredentials('priya', 'priya123')}
              >
                <User size={13} /> priya
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ height: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => fillCredentials('rahul', 'rahul123')}
              >
                <User size={13} /> rahul
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{
                  height: '34px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--accent-ink)',
                  borderColor: 'var(--accent)',
                  background: 'var(--accent-soft)',
                }}
                onClick={() => fillCredentials('admin', 'admin123')}
              >
                <Shield size={13} /> admin
              </button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to restaurants
          </Link>
        </div>
      </div>
    </div>
  );
};

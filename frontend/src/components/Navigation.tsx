import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StaggeredMenu from './StaggeredMenu/StaggeredMenu';
import type { StaggeredMenuItem } from './StaggeredMenu/StaggeredMenu';
import { User, LogOut, ShieldCheck, Utensils } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems: StaggeredMenuItem[] = [
    { label: 'Restaurants', link: '/' },
    { label: 'My Bookings', link: '/bookings' },
  ];

  if (user?.is_admin) {
    menuItems.push({ label: 'Admin Dashboard', link: '/admin' });
  }

  if (user) {
    menuItems.push({
      label: 'Sign Out',
      onClick: async () => {
        await logout();
        navigate('/');
      },
    });
  } else {
    menuItems.push({ label: 'Sign In / Register', link: '/login' });
  }

  const socialItems = [
    { label: 'Instagram', link: 'https://instagram.com' },
    { label: 'Twitter / X', link: 'https://twitter.com' },
    { label: 'GitHub', link: 'https://github.com' },
  ];

  const handleLogoClick = () => {
    navigate('/');
  };

  const userBadge = user ? (
    <div
      onClick={() => navigate(user.is_admin ? '/admin' : '/bookings')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '999px',
        border: '1px solid var(--border)',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text)',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      title={user.is_admin ? 'Admin user' : 'Logged in'}
    >
      {user.is_admin ? <ShieldCheck size={14} color="#1d5fd6" /> : <User size={14} color="#5c6064" />}
      <span>{user.username}</span>
      {user.is_admin ? (
        <span
          style={{
            fontSize: '10px',
            background: '#dcf1ff',
            color: '#0a3a80',
            padding: '2px 6px',
            borderRadius: '999px',
            fontWeight: 700,
          }}
        >
          ADMIN
        </span>
      ) : null}
    </div>
  ) : (
    <button
      onClick={() => navigate('/login')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '999px',
        border: '1px solid var(--border)',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--accent)',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <User size={14} />
      <span>Sign In</span>
    </button>
  );

  return (
    <StaggeredMenu
      position="right"
      items={menuItems}
      socialItems={socialItems}
      displaySocials={true}
      displayItemNumbering={true}
      colors={['#dcf1ff', '#1d5fd6']}
      accentColor="#1d5fd6"
      isFixed={true}
      logoElement={
        <div
          onClick={handleLogoClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '999px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#1d5fd6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Utensils size={15} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#1b1d1f' }}>
            Tablu
          </span>
        </div>
      }
      headerChildren={userBadge}
      panelHeader={
        user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--ground)',
              borderRadius: 'var(--radius-control)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{user.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {user.is_admin ? 'Administrator' : 'Customer'}
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )
      }
    />
  );
};

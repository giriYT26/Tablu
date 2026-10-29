import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StaggeredMenu from './StaggeredMenu/StaggeredMenu';
import type { StaggeredMenuItem } from './StaggeredMenu/StaggeredMenu';
import RouteNav from './RouteNav';
import type { RouteNavItem } from './RouteNav';
import { LogOut, ShieldCheck, Utensils, LogIn } from 'lucide-react';

const headerNavVars = {
  '--gn-frame': 'rgba(255, 253, 248, 0.82)',
  '--gn-frame-edge': 'rgba(231, 220, 203, 0.85)',
  '--gn-frame-highlight': 'rgba(255, 255, 255, 0.95)',
  '--gn-frame-shadow': '0 6px 22px rgba(60, 38, 16, 0.06)',
  '--gn-ink': '#1a1410',
  '--gn-muted': '#736658',
} as React.CSSProperties;

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

  const navItems: RouteNavItem[] = [
    { label: 'Restaurants', to: '/' },
    { label: 'My bookings', to: '/bookings' },
  ];

  if (user?.is_admin) {
    navItems.push({ label: 'Admin', to: '/admin' });
  }

  const initials = user ? user.username.slice(0, 2).toUpperCase() : '';

  const headerRight = (
    <div className="header-right">
      <RouteNav
        items={navItems}
        ariaLabel="Primary"
        className="header-nav"
        size="sm"
        theme="light"
        color="#1a1410"
        activeTextColor="#fff8ef"
        colors={['#b5431f', '#1a1410']}
        style={headerNavVars}
      />

      {user ? (
        <button
          type="button"
          className="user-chip"
          onClick={() => navigate(user.is_admin ? '/admin' : '/bookings')}
          title={user.is_admin ? 'Admin account' : 'View your bookings'}
        >
          <span className={`avatar${user.is_admin ? ' is-admin' : ''}`}>
            {user.is_admin ? <ShieldCheck size={13} /> : initials}
          </span>
          <span>{user.username}</span>
          {user.is_admin ? <span className="badge-admin">ADMIN</span> : null}
        </button>
      ) : (
        <button type="button" className="btn-signin" onClick={() => navigate('/login')}>
          <LogIn size={14} />
          <span>Sign in</span>
        </button>
      )}
    </div>
  );

  const panelHeader = user ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-control)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: user.is_admin ? 'var(--ink)' : 'var(--accent-soft)',
            color: user.is_admin ? '#fff3e6' : 'var(--accent-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          {user.is_admin ? <ShieldCheck size={16} /> : initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{user.username}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
            {user.is_admin ? 'Administrator' : 'Diner'}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate('/');
        }}
        style={{
          background: 'none',
          border: 0,
          color: 'var(--muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 6,
        }}
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  ) : null;

  return (
    <StaggeredMenu
      position="right"
      items={menuItems}
      socialItems={socialItems}
      displaySocials={true}
      displayItemNumbering={true}
      colors={['#f8e6d7', '#b5431f']}
      accentColor="#b5431f"
      isFixed={true}
      menuButtonColor="#1a1410"
      openMenuButtonColor="#fff8ef"
      logoElement={
        <div className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">
            <Utensils size={15} />
          </span>
          <span className="brand-word">Tablu</span>
        </div>
      }
      headerChildren={headerRight}
      panelHeader={panelHeader}
    />
  );
};

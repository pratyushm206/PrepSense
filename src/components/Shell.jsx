import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand" aria-label="PrepSense dashboard">
          <span className="brand-mark">P</span>
          <span className="brand-name">PrepSense</span>
        </NavLink>
        <button className="nav-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
        <nav id="primary-navigation" className={`nav-links${menuOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
          <NavLink onClick={() => setMenuOpen(false)} to="/dashboard">Dashboard</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/interview/new">Practice</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/history">History</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/leaderboard">Leaderboard</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/recommendations">Recommendations</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/resume-analyzer">Resume</NavLink>
          {user?.isAdmin && <NavLink onClick={() => setMenuOpen(false)} to="/admin">Admin</NavLink>}
        </nav>
        <div className="user-actions">
          <NavLink
            to="/profile"
            className="user-avatar"
            title={user?.name || user?.email}
            aria-label="Open profile"
          >
            {initial}
          </NavLink>
          <button type="button" className="button ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

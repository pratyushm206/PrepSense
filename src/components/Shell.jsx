import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand" aria-label="PrepSense dashboard">
          <span className="brand-mark">P</span>
          <span className="brand-name">PrepSense</span>
        </NavLink>
        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/interview/new">Practice</NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/recommendations">Recommendations</NavLink>
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

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand">PrepSense</NavLink>
        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/interview/new">Practice</NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <div className="user-actions">
          <span>{user?.name || user?.email}</span>
          <button type="button" className="button ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

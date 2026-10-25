import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon, { CloseIcon, MenuIcon } from './Icon.jsx';
import Logo from './Logo.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(() => window.matchMedia('(max-width: 1099px)').matches);
  const menuToggleRef = useRef(null);
  const menuPanelRef = useRef(null);
  const initial = (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1099px)');
    const updateMobileNav = event => {
      setIsMobileNav(event.matches);
      if (!event.matches) setMenuOpen(false);
    };
    setIsMobileNav(media.matches);
    media.addEventListener('change', updateMobileNav);
    return () => media.removeEventListener('change', updateMobileNav);
  }, []);

  useEffect(() => {
    if (isMobileNav && menuPanelRef.current?.contains(document.activeElement)) {
      menuToggleRef.current?.focus();
    }
    setMenuOpen(false);
  }, [location.pathname, location.search, location.hash, isMobileNav]);

  useEffect(() => {
    if (!menuOpen || !isMobileNav) return undefined;

    function handlePointerDown(event) {
      const clickedPanel = menuPanelRef.current?.contains(event.target);
      const clickedToggle = menuToggleRef.current?.contains(event.target);
      if (!clickedPanel && !clickedToggle) setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, isMobileNav]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
    if (isMobileNav) menuToggleRef.current?.focus();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand" aria-label="PrepSense dashboard">
          <Logo size={32} showText />
        </NavLink>
        <button
          ref={menuToggleRef}
          className="nav-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen(open => !open)}
        >
          <span className="nav-toggle-icon" aria-hidden="true">
            <MenuIcon className={`nav-toggle-glyph${menuOpen ? ' is-hidden' : ''}`} />
            <CloseIcon className={`nav-toggle-glyph nav-toggle-close${menuOpen ? ' is-visible' : ''}`} />
          </span>
        </button>
        <nav
          ref={menuPanelRef}
          id="primary-navigation"
          className={`nav-links${menuOpen ? ' is-open' : ''}`}
          aria-label="Primary navigation"
          inert={isMobileNav ? !menuOpen : undefined}
        >
          <NavigationLink icon="grid" to="/dashboard" onClick={closeMenu}>Dashboard</NavigationLink>
          <NavigationLink icon="calendar" to="/interview/new" onClick={closeMenu}>Practice</NavigationLink>
          <NavigationLink icon="clock" to="/history" onClick={closeMenu}>History</NavigationLink>
          <NavigationLink icon="chart" to="/leaderboard" onClick={closeMenu}>Leaderboard</NavigationLink>
          <NavigationLink icon="bulb" to="/recommendations" onClick={closeMenu}>Recommendations</NavigationLink>
          <NavigationLink icon="document" to="/resume-analyzer" onClick={closeMenu}>Resume</NavigationLink>
          {user?.isAdmin && <NavigationLink icon="target" to="/admin" onClick={closeMenu}>Admin</NavigationLink>}
          <button type="button" className="nav-mobile-logout button danger-ghost" onClick={handleLogout}>
            <Icon name="logout" />
            <span>Log out</span>
          </button>
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

function NavigationLink({ icon, to, onClick, children }) {
  return (
    <NavLink end onClick={onClick} to={to}>
      <Icon name={icon} />
      <span>{children}</span>
    </NavLink>
  );
}

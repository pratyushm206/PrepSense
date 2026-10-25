import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon, { CloseIcon, MenuIcon } from './Icon.jsx';
import Logo from './Logo.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(() => window.matchMedia('(max-width: 1099px)').matches);
  const menuToggleRef = useRef(null);
  const menuPanelRef = useRef(null);
  const accountToggleRef = useRef(null);
  const accountPanelRef = useRef(null);
  const logoutStartedRef = useRef(false);
  const userName = typeof user?.name === 'string' ? user.name.trim() : '';
  const userEmail = typeof user?.email === 'string' ? user.email.trim() : '';
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

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
    setAccountOpen(false);
  }, [location.pathname, location.search, location.hash, isMobileNav]);

  useEffect(() => {
    if (logoutDialogOpen || ((!menuOpen || !isMobileNav) && !accountOpen)) return undefined;

    function handlePointerDown(event) {
      const inAccountPanel = accountPanelRef.current?.contains(event.target);
      const onAccountToggle = accountToggleRef.current?.contains(event.target);
      if (accountOpen && !inAccountPanel && !onAccountToggle) setAccountOpen(false);

      const inMenuPanel = menuPanelRef.current?.contains(event.target);
      const onMenuToggle = menuToggleRef.current?.contains(event.target);
      if (menuOpen && isMobileNav && !inMenuPanel && !onMenuToggle) setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (accountOpen) {
          setAccountOpen(false);
          accountToggleRef.current?.focus();
        } else if (menuOpen && isMobileNav) {
          setMenuOpen(false);
          menuToggleRef.current?.focus();
        }
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen, logoutDialogOpen, menuOpen, isMobileNav]);

  function confirmLogout() {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    setLogoutPending(true);
    logout();
    navigate('/', { replace: true });
  }

  function requestLogout() {
    logoutStartedRef.current = false;
    setLogoutPending(false);
    setLogoutDialogOpen(true);
  }

  function toggleAccountMenu() {
    setMenuOpen(false);
    setAccountOpen(open => !open);
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
          onClick={() => {
            setAccountOpen(false);
            setMenuOpen(open => !open);
          }}
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
          <button type="button" className="nav-mobile-logout button danger-ghost" onClick={requestLogout}>
            <Icon name="logout" />
            <span>Log out</span>
          </button>
        </nav>
        <div className="user-actions">
          <div className="account-menu-wrap">
            <button
              ref={accountToggleRef}
              type="button"
              className="account-toggle"
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={accountOpen}
              aria-controls="account-menu-panel"
              onClick={toggleAccountMenu}
            >
              <span className="account-avatar" aria-hidden="true">{initial}</span>
              <span className="account-toggle-chevron" aria-hidden="true"><Icon name="chevronDown" /></span>
            </button>
            {accountOpen && (
              <div ref={accountPanelRef} id="account-menu-panel" className="account-panel">
                <div className="account-panel-header">
                  <span className="account-panel-avatar" aria-hidden="true">{initial}</span>
                  <div className="account-identity">
                    <div className="account-name-row">
                      {userName && <strong className="account-name">{userName}</strong>}
                      {user?.isAdmin && <span className="account-admin-chip">Admin</span>}
                    </div>
                    {userEmail && <p className="account-email">{userEmail}</p>}
                  </div>
                </div>
                <div className="account-divider" role="separator" />
                <NavLink className="account-row" to="/profile" onClick={() => setAccountOpen(false)}>
                  <Icon name="user" />
                  <span>Profile</span>
                </NavLink>
                <div className="account-divider" role="separator" />
                <button type="button" className="account-row account-logout button danger-ghost" onClick={requestLogout}>
                  <Icon name="logout" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      {logoutDialogOpen && (
        <ConfirmDialog
          title="Log out?"
          description="You will need to sign in again to continue practising."
          role="alertdialog"
          className="logout-confirm"
          onClose={() => setLogoutDialogOpen(false)}
        >
          <div className="logout-confirm-actions">
            <button
              type="button"
              className="button secondary"
              data-initial-focus
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="button danger" onClick={confirmLogout} disabled={logoutPending}>
              Log out
            </button>
          </div>
        </ConfirmDialog>
      )}
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

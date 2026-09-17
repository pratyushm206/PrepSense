import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function Profile() {
  const { user, token, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [companies, setCompanies] = useState(user?.targetCompanies || []);
  const [companyDraft, setCompanyDraft] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const initial = (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '—';

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const data = await apiRequest('/api/sessions', { token });
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSessions([]);
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setSaved(false);

    const nextName = name.trim();
    if (!nextName) {
      setError('Name is required.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ name: nextName, targetCompanies: companies });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addCompany() {
    const nextCompany = companyDraft.trim();
    if (!nextCompany) return;
    if (!companies.some(company => company.toLowerCase() === nextCompany.toLowerCase())) {
      setCompanies([...companies, nextCompany]);
    }
    setCompanyDraft('');
  }

  function removeCompany(companyToRemove) {
    setCompanies(companies.filter(company => company !== companyToRemove));
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setError('');
    setPasswordMessage('');

    if (passwords.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await apiRequest('/api/auth/me/password', {
        method: 'PUT',
        token,
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        }
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeactivate() {
    try {
      setError('');
      setDeactivating(true);
      await apiRequest('/api/auth/me/deactivate', {
        method: 'PUT',
        token
      });
      logout();
    } catch (err) {
      setError(err.message);
      setDeactivating(false);
    }
  }

  return (
    <section className="page-stack profile-page">
      <div className="profile-hero">
        <div className="profile-avatar-lg" aria-hidden="true">{initial}</div>
        <div>
          <p className="eyebrow">Account</p>
          <h1>{user?.name || 'Your profile'}</h1>
          <p className="lead">{user?.email}</p>
        </div>
        <ThemeToggle className="profile-theme-toggle" />
      </div>

      <div className="grid three profile-stats">
        <article className="stat-orb">
          <span>Sessions</span>
          <strong>{sessions.length}</strong>
        </article>
        <article className="stat-orb">
          <span>Target companies</span>
          <strong>{user?.targetCompanies?.length || 0}</strong>
        </article>
        <article className="stat-orb">
          <span>Member since</span>
          <strong className="stat-date">{joined}</strong>
        </article>
      </div>

      {error && <div className="field-error form-error">{error}</div>}

      <form className="panel profile-form" onSubmit={handleSave}>
        <div className="section-heading">
          <h2>Profile details</h2>
          {saved && <span className="status-label strong">Saved</span>}
        </div>
        <label>
          Name
          <input value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label>
          Email
          <input value={user?.email || ''} disabled />
          <span className="helper-text">Email is tied to your account and cannot be changed here.</span>
        </label>
        <div className="field">
          <span className="field-label">Target companies</span>
          <div className="chip-editor">
            {companies.map(company => (
              <button className="chip selected removable-chip" key={company} type="button" onClick={() => removeCompany(company)}>
                {company} x
              </button>
            ))}
            <div className="chip-add">
              <input
                value={companyDraft}
                onChange={event => setCompanyDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCompany();
                  }
                }}
                placeholder="Add company"
              />
              <button className="button secondary" type="button" onClick={addCompany}>Add</button>
            </div>
          </div>
          <span className="helper-text">Used for recommendations and company leaderboard filters.</span>
        </div>
        <div className="action-row">
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          <Link className="button ghost" to="/dashboard">Back to dashboard</Link>
        </div>
      </form>

      <form className="panel profile-form" onSubmit={handlePasswordChange}>
        <div className="section-heading">
          <h2>Password</h2>
          {passwordMessage && <span className="status-label strong">{passwordMessage}</span>}
        </div>
        <label>
          Current password
          <input
            type="password"
            value={passwords.currentPassword}
            onChange={event => setPasswords({ ...passwords, currentPassword: event.target.value })}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={passwords.newPassword}
            onChange={event => setPasswords({ ...passwords, newPassword: event.target.value })}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={passwords.confirmPassword}
            onChange={event => setPasswords({ ...passwords, confirmPassword: event.target.value })}
          />
        </label>
        <div className="action-row">
          <button className="button secondary" type="submit" disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>

      <section className="panel profile-projects">
        <div className="section-heading">
          <h2>Other Projects by Pratyush Mishra</h2>
          <span>Portfolio</span>
        </div>
        <div className="project-link-grid">
          <a
            className="project-link-card"
            href="https://nutri-track-sage.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>NutriTrack</strong>
            <span>Nutrition and fitness tracker</span>
          </a>
          <a
            className="project-link-card"
            href="https://ai-resume-analyzer-pratyushm206.streamlit.app/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>AI Resume Analyzer</strong>
            <span>Resume feedback and analysis</span>
          </a>
        </div>
      </section>

      <section className="panel danger-zone">
        <div>
          <h2>Deactivate account</h2>
          <p>Your practice history is kept, you just can't log back in.</p>
        </div>
        <button className="button danger" type="button" onClick={() => setConfirmDeactivate(true)}>
          Deactivate account
        </button>
      </section>

      {confirmDeactivate && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <h2 id="deactivate-title">Deactivate account?</h2>
            <p>Your practice history is kept, you just can't log back in.</p>
            <div className="action-row">
              <button className="button danger" type="button" onClick={handleDeactivate} disabled={deactivating}>
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
              <button className="button ghost" type="button" onClick={() => setConfirmDeactivate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

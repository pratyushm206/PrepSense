import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function Profile() {
  const { user, token, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [companies, setCompanies] = useState(user?.targetCompanies || []);
  const [college, setCollege] = useState(user?.college || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [companyDraft, setCompanyDraft] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [overview, setOverview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const initial = (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();
  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await apiRequest('/api/analytics/overview', { token });
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setOverview(null);
      }
    }

    loadOverview();
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
      await updateProfile({
        name: nextName,
        targetCompanies: companies,
        college,
        graduationYear: graduationYear === '' ? null : Number(graduationYear),
        githubUrl,
        linkedinUrl
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      setError('');
      setExporting(true);
      const data = await apiRequest('/api/auth/me/export', { token });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'prepsense-account-export.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
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

  async function handleDeleteAccount() {
    try {
      setError('');
      setDeleting(true);
      await apiRequest('/api/auth/me/delete', {
        method: 'POST',
        token,
        body: { password: deletePassword, confirm: deleteConfirmation }
      });
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <section className="page-stack profile-page">
      <section className="signature-card profile-banner">
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
            <span>Average score</span>
            <strong>{overview ? `${overview.averageScore}%` : '—'}</strong>
          </article>
          <article className="stat-orb">
            <span>Best topic</span>
            <strong>{overview?.bestTopic || '—'}</strong>
          </article>
          <article className="stat-orb">
            <span>{overview?.answersEvaluated === 1 ? 'Answer evaluated' : 'Answers evaluated'}</span>
            <strong>{overview?.answersEvaluated ?? '—'}</strong>
          </article>
        </div>
      </section>

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
        <label>
          College (optional)
          <input maxLength="120" value={college} onChange={event => setCollege(event.target.value)} />
        </label>
        <label>
          Graduation year (optional)
          <input type="number" min={new Date().getFullYear() - 10} max={new Date().getFullYear() + 10} value={graduationYear} onChange={event => setGraduationYear(event.target.value)} />
        </label>
        <label>
          GitHub URL (optional)
          <input type="url" placeholder="https://github.com/username" value={githubUrl} onChange={event => setGithubUrl(event.target.value)} />
        </label>
        <label>
          LinkedIn URL (optional)
          <input type="url" placeholder="https://www.linkedin.com/in/username" value={linkedinUrl} onChange={event => setLinkedinUrl(event.target.value)} />
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
        <div className="action-row profile-actions">
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          <Link className="button ghost" to="/dashboard">Back to dashboard</Link>
          <button className="button secondary" type="button" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Preparing export...' : 'Export my data (JSON)'}
          </button>
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

      <section className="profile-danger-zone">
        <h2>Danger zone</h2>
        <section className="panel danger-zone">
          <div>
            <h3>Deactivate account</h3>
            <p>Your practice history is kept, you just can't log back in.</p>
          </div>
          <button className="button danger-ghost" type="button" onClick={() => setConfirmDeactivate(true)}>
            Deactivate account
          </button>
        </section>

        <section className="panel danger-zone">
          <div>
            <h3>Delete account permanently</h3>
            <p>Your account and practice sessions will be permanently deleted.</p>
          </div>
          <button className="button danger-ghost" type="button" onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        </section>
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete account permanently?"
          description="This removes your account and practice history. Enter your password and type DELETE to continue."
          onClose={() => setConfirmDelete(false)}
          closeOnEscape={!deleting}
          closeOnBackdrop={!deleting}
        >
          <label>Password<input type="password" autoComplete="current-password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} /></label>
          <label>Type DELETE<input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} /></label>
          <div className="action-row">
            <button className="button danger" type="button" onClick={handleDeleteAccount} disabled={deleting || !deletePassword || deleteConfirmation !== 'DELETE'}>
              {deleting ? 'Deleting...' : 'Permanently delete'}
            </button>
            <button className="button ghost" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
          </div>
        </ConfirmDialog>
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          title="Deactivate account?"
          description="Your practice history is kept, you just can't log back in."
          onClose={() => setConfirmDeactivate(false)}
          closeOnEscape={!deactivating}
          closeOnBackdrop={!deactivating}
        >
          <div className="action-row">
            <button className="button danger" type="button" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </button>
            <button className="button ghost" type="button" onClick={() => setConfirmDeactivate(false)}>
              Cancel
            </button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

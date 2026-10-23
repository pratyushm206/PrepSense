import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function History() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const data = await apiRequest('/api/sessions', { token });
        if (!cancelled) setSessions(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshSessions() {
    const data = await apiRequest('/api/sessions', { token });
    setSessions(data);
  }

  async function deleteConfirmedSession() {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await apiRequest(`/api/sessions/${confirmDelete._id}`, { method: 'DELETE', token });
      setConfirmDelete(null);
      if (sessionId === confirmDelete._id) navigate('/history', { replace: true });
      await refreshSessions();
      window.dispatchEvent(new CustomEvent('prepsense:analytics-refresh'));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function clearFailedSessions() {
    if (!window.confirm('Permanently delete all sessions with failed evaluations?')) return;
    try {
      setDeleting(true);
      await apiRequest('/api/sessions/failed', { method: 'DELETE', token });
      await refreshSessions();
      window.dispatchEvent(new CustomEvent('prepsense:analytics-refresh'));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState message="Loading session history..." />;
  if (error) return <ErrorState message={error} />;

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        message="Practice sessions you create will appear here with company, role, score, and full Q&A history."
        action={<Link className="button primary" to="/interview/new">Start a session</Link>}
      />
    );
  }

  const filteredSessions = sessions.filter(session => {
    if (filter === 'completed') return isCompletedSession(session);
    if (filter === 'needs-attention') return hasFailedEvaluation(session);
    return true;
  });

  return (
    <section className="page-stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Archive</p>
          <h1>Your practice log.</h1>
        </div>
        <div className="filter-row" aria-label="Session filters">
          <button
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            type="button"
          >
            All ({sessions.length})
          </button>
          <button
            className={`filter-chip ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
            type="button"
          >
            Completed ({sessions.filter(isCompletedSession).length})
          </button>
          <button
            className={`filter-chip ${filter === 'needs-attention' ? 'active' : ''}`}
            onClick={() => setFilter('needs-attention')}
            type="button"
          >
            Needs attention ({sessions.filter(hasFailedEvaluation).length})
          </button>
          {filter === 'needs-attention' && sessions.some(hasFailedEvaluation) && (
            <button className="button danger" type="button" onClick={clearFailedSessions} disabled={deleting}>
              Clear failed sessions
            </button>
          )}
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <EmptyState
          title={`No ${filter} sessions`}
          message="Try a different filter or start a fresh practice session."
          action={<Link className="button primary" to="/interview/new">Start a session</Link>}
        />
      ) : (
        <div className="session-list">
          {filteredSessions.map(session => (
          <div className="session session-row" key={session._id}>
          <Link className="session-main-link" to={`/history/${session._id}`}>
            <div className={`score-badge ${getScoreClass(session.overallScore)}`}>
              {getSessionScoreLabel(session)}
            </div>
            <div className="s-main">
              <div className="s-company">{session.company}</div>
              <div className="s-role">{getSessionMeta(session)}</div>
            </div>
            <div className="s-tags">
              {session.failedEvaluation && (
                <span className="tag tag-flag">evaluation failed</span>
              )}
              {(session.topics || []).slice(0, 2).map(topic => <span className="tag" key={topic}>{topic}</span>)}
            </div>
            <div className="s-date">{formatDate(session.completedAt)}</div>
            <div className="s-arrow">-&gt;</div>
          </Link>
          <button className="button danger session-delete" type="button" onClick={() => setConfirmDelete(session)}>Delete</button>
          </div>
          ))}
        </div>
      )}

      {filteredSessions.some(hasFailedEvaluation) && (
        <div className="empty-hint">
          <span className="dot" />
          Failed evaluations are shown separately so evaluation-pipeline results do not read like genuine interview scores.
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
            <h2 id="delete-session-title">Delete this session?</h2>
            <p>This permanently deletes the {confirmDelete.company} practice session and its answers.</p>
            <div className="action-row">
              <button className="button danger" type="button" onClick={deleteConfirmedSession} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete session'}</button>
              <button className="button ghost" type="button" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getScoreClass(score) {
  if (score === null || score === undefined) return 'score-zero';
  if (score >= 70) return 'score-good';
  if (score >= 40) return 'score-warn';
  return 'score-bad';
}

function getSessionScoreLabel(session) {
  return session.overallScore === null || session.overallScore === undefined
    ? '-'
    : session.overallScore;
}

function isCompletedSession(session) {
  return Boolean(session.completed);
}

function hasFailedEvaluation(session) {
  return Boolean(session.failedEvaluation);
}

function getSessionMeta(session) {
  const difficulty = session.difficulty || 'Medium';
  const count = session.questionCount || 0;
  const label = count === 1 ? 'question' : 'questions';
  return `${session.role} · ${capitalize(difficulty)} · ${count} ${label}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function History() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className="page-stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Archive</p>
          <h1>Your practice log.</h1>
        </div>
        <div className="filter-row" aria-label="Session filters">
          <span className="filter-chip active">All</span>
          <span className="filter-chip">Completed</span>
          <span className="filter-chip">Incomplete</span>
        </div>
      </div>

      <div className="session-list">
        {sessions.map(session => (
          <Link className="session" to={`/history/${session._id}`} key={session._id}>
            <div className={`score-badge ${getScoreClass(session.overallScore)}`}>
              {session.overallScore > 0 ? session.overallScore : '-'}
            </div>
            <div className="s-main">
              <div className="s-company">{session.company}</div>
              <div className="s-role">{getSessionMeta(session)}</div>
            </div>
            <div className="s-tags">
              {getTopicTags(session).length > 0 ? (
                getTopicTags(session).map(topic => <span className="tag" key={topic}>{topic}</span>)
              ) : (
                <span className="tag tag-flag">evaluation failed</span>
              )}
            </div>
            <div className="s-date">{formatDate(session.completedAt)}</div>
            <div className="s-arrow">-&gt;</div>
          </Link>
        ))}
      </div>

      {sessions.some(session => session.overallScore === 0) && (
        <div className="empty-hint">
          <span className="dot" />
          Zero-score sessions are shown separately so evaluation-pipeline results do not read like genuine interview scores.
        </div>
      )}
    </section>
  );
}

function getScoreClass(score) {
  if (!score) return 'score-zero';
  if (score >= 70) return 'score-good';
  if (score >= 40) return 'score-warn';
  return 'score-bad';
}

function getSessionMeta(session) {
  const firstQuestion = session.questions?.[0];
  const difficulty = firstQuestion?.difficulty || 'Medium';
  const count = session.questions?.length || 0;
  const label = count === 1 ? 'question' : 'questions';
  return `${session.role} · ${capitalize(difficulty)} · ${count} ${label}`;
}

function getTopicTags(session) {
  if (!session.overallScore) return [];
  const topics = session.questions?.map(question => question.topic).filter(Boolean) || [];
  return [...new Set(topics)].slice(0, 2);
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

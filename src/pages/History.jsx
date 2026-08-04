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
      <div className="section-heading">
        <div>
          <p className="eyebrow">History</p>
          <h1>Your practice archive</h1>
        </div>
      </div>

      <div className="history-list">
        {sessions.map(session => (
          <Link className="history-row" to={`/history/${session._id}`} key={session._id}>
            <div>
              <strong>{session.company}</strong>
              <span>{session.role}</span>
            </div>
            <span>{new Date(session.completedAt).toLocaleDateString()}</span>
            <strong>{session.overallScore || 0}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

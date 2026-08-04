import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function Dashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await apiRequest('/api/analytics/overview', { token });
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <LoadingState message="Loading your readiness profile..." />;
  if (error) return <ErrorState message={error} />;

  const hasData = overview.topicBreakdown?.length > 0;

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Readiness score</p>
          <h1>{overview.readinessScore}</h1>
          <p>Built from your latest evaluated practice sessions.</p>
        </div>
        <Link className="button primary" to="/interview/new">Start practice</Link>
      </div>

      {!hasData ? (
        <EmptyState
          title="No practice data yet"
          message="Generate your first mock interview to unlock topic scores, weak areas, and trends."
          action={<Link className="button primary" to="/interview/new">Create first session</Link>}
        />
      ) : (
        <>
          <section className="grid two">
            <TopicList title="Weak areas" tone="weak" topics={overview.weakAreas} />
            <TopicList title="Strong areas" tone="strong" topics={overview.strongAreas} />
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Topic breakdown</h2>
              <span>{overview.topicBreakdown.length} topics attempted</span>
            </div>
            <div className="topic-table">
              {overview.topicBreakdown.map(topic => (
                <div className="topic-row" key={topic.topic}>
                  <div>
                    <strong>{topic.topic}</strong>
                    <span>{topic.totalAttempted} attempted</span>
                  </div>
                  <span className={`trend ${topic.trend}`}>{topic.trend}</span>
                  <strong>{topic.avgScore}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function TopicList({ title, topics, tone }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`status-label ${tone}`}>{tone === 'weak' ? 'Needs work' : 'Keep sharp'}</span>
      </div>
      <div className="mini-list">
        {topics.map(topic => (
          <div className="mini-item" key={topic.topic}>
            <span>{topic.topic}</span>
            <strong>{topic.avgScore}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

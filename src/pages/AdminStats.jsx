import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';

export default function AdminStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/admin/stats', { token })
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState message="Loading platform stats..." />;

  return (
    <section className="page-stack admin-stats-page">
      <div className="page-head admin-hero signature-card">
        <div><p className="eyebrow">Administration</p><h1>Platform stats.</h1></div>
      </div>
      <div className="grid three admin-stat-grid">
        <article className="stat-orb"><span>{stats.totalUsers === 1 ? 'Total user' : 'Total users'}</span><strong>{stats.totalUsers}</strong></article>
        <article className="stat-orb"><span>{stats.totalSessions === 1 ? 'Practice session' : 'Practice sessions'}</span><strong>{stats.totalSessions}</strong></article>
        <article className="stat-orb"><span>Average readiness</span><strong>{stats.avgReadinessScore}</strong></article>
      </div>
      <section className="panel">
        <div className="section-heading"><h2>Most practiced companies</h2></div>
        {(stats.topCompaniesPracticed || []).length === 0 ? (
          <p className="muted">No evaluated sessions yet.</p>
        ) : (
          <div className="topic-table">
            {stats.topCompaniesPracticed.map(item => (
              <div className="topic-row" key={item.company}>
                <strong>{item.company}</strong><span>{item.count} {item.count === 1 ? 'evaluated session' : 'evaluated sessions'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

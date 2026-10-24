import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';
import Icon from '../components/Icon.jsx';

export default function AdminStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/admin/stats', { token })
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, [token]);

  if (error) {
    if (error.status === 403) {
      return (
        <section className="admin-access-state" role="alert">
          <span className="icon-tile"><Icon name="target" /></span>
          <div><p className="eyebrow">Administration</p><h1>Not authorised</h1><p>{error.message}</p></div>
        </section>
      );
    }
    return <ErrorState message={error.message} />;
  }
  if (!stats) return <LoadingState message="Loading platform stats..." />;

  const companies = stats.topCompaniesPracticed || [];
  const largestCompanyCount = Math.max(...companies.map(item => item.count), 0);

  return (
    <section className="page-stack admin-stats-page">
      <header className="admin-hero signature-card" aria-labelledby="admin-page-title">
        <div className="admin-hero-heading">
          <p className="eyebrow">Administration</p>
          <span className="admin-only-chip">Admin only</span>
          <h1 id="admin-page-title">Platform stats.</h1>
        </div>
        <div className="admin-stat-grid">
          <AdminStat label="Total users" value={stats.totalUsers} caption="All registered user accounts." icon="grid" />
          <AdminStat label="Practice sessions" value={stats.totalSessions} caption="Sessions with at least one question, including unevaluated and failed evaluations." icon="calendar" />
          <AdminStat label="Average readiness" value={stats.avgReadinessScore} caption="Rounded mean of per-user readiness for users with a successful evaluation." icon="chart" />
        </div>
      </header>
      <section className="panel admin-company-panel" aria-labelledby="admin-company-title">
        <div className="section-heading"><h2 id="admin-company-title">Most practiced companies</h2></div>
        {companies.length === 0 ? (
          <div className="admin-company-empty">
            <span className="icon-tile"><Icon name="chart" /></span>
            <p>No evaluated sessions yet.</p>
          </div>
        ) : (
          <ol className="admin-company-list">
            {companies.map((item, index) => (
              <li className="admin-company-row" key={item.company}>
                <span className={`admin-company-rank${index < 3 ? ` rank-${index + 1}` : ''}`} aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                <strong className="admin-company-name">{item.company}</strong>
                <span className="admin-company-bar" aria-hidden="true"><i style={{ width: `${largestCompanyCount ? (item.count / largestCompanyCount) * 100 : 0}%` }} /></span>
                <span className="admin-company-count">{item.count} {item.count === 1 ? 'evaluated session' : 'evaluated sessions'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

function AdminStat({ label, value, caption, icon }) {
  return (
    <article className="admin-stat">
      <div className="admin-stat-topline"><span className="admin-stat-icon"><Icon name={icon} /></span><span>{label}</span></div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}

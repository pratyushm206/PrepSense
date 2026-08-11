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
      <div className="gauge-panel">
        <div className="gauge-wrap">
          <svg className="gauge-svg" viewBox="0 0 240 150" aria-hidden="true">
            <path className="gauge-track" d="M 30 130 A 90 90 0 0 1 210 130" />
            <path
              className="gauge-fill"
              d="M 30 130 A 90 90 0 0 1 210 130"
              style={{
                '--score': overview.readinessScore,
                '--score-color': getScoreColor(overview.readinessScore)
              }}
            />
            <GaugeTicks />
          </svg>
          <div className="gauge-readout">
            <div className="gauge-num">{overview.readinessScore}</div>
            <div className="gauge-unit">Readiness / 100</div>
          </div>
          <div className="gauge-zones">
            <div className="zone"><span className="zone-dot zone-red" />0-39</div>
            <div className="zone"><span className="zone-dot zone-amber" />40-69</div>
            <div className="zone"><span className="zone-dot zone-teal" />70-100</div>
          </div>
        </div>
        <div className="gauge-side">
          <p className="eyebrow">System status</p>
          <h1 className="gauge-title">{getStatusTitle(overview.readinessScore)}</h1>
          <p className="gauge-desc">Built from your latest evaluated practice sessions.</p>
          <Link className="button primary cta" to="/interview/new">Start practice {'->'}</Link>
        </div>
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

          <section className="breakdown">
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
            <div className="topic-score-wrap">
              <div className="topic-bar">
                <div
                  className="topic-bar-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, topic.avgScore))}%`,
                    background: getScoreColor(topic.avgScore)
                  }}
                />
              </div>
              <strong style={{ color: getScoreColor(topic.avgScore) }}>{topic.avgScore}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GaugeTicks() {
  const cx = 120;
  const cy = 130;
  const r = 90;

  return (
    <g>
      {Array.from({ length: 11 }, (_, index) => {
        const angle = Math.PI - (index / 10) * Math.PI;
        const x1 = cx + (r - 10) * Math.cos(angle);
        const y1 = cy - (r - 10) * Math.sin(angle);
        const x2 = cx + (r + 2) * Math.cos(angle);
        const y2 = cy - (r + 2) * Math.sin(angle);
        return <line className="gauge-tick" x1={x1} y1={y1} x2={x2} y2={y2} key={index} />;
      })}
    </g>
  );
}

function getScoreColor(score) {
  if (score >= 70) return 'var(--teal)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}

function getStatusTitle(score) {
  if (score >= 70) return "You're interview-ready.";
  if (score >= 40) return "You're mid-calibration.";
  return 'Needs focused reps.';
}

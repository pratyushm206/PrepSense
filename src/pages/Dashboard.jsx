import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const [data, sessions] = await Promise.all([
          apiRequest('/api/analytics/overview', { token }),
          apiRequest('/api/sessions', { token }).catch(() => [])
        ]);
        if (!cancelled) {
          setOverview(data);
          setSessionCount(Array.isArray(sessions) ? sessions.length : 0);
        }
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
  const firstName = (user?.name || 'there').split(' ')[0];

  return (
    <section className="page-stack dashboard-stage">
      <GaugeHero
        score={overview.readinessScore}
        firstName={firstName}
        sessionCount={sessionCount}
        topicCount={overview.topicBreakdown?.length || 0}
      />

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

          <section className="breakdown depth-panel">
            <div className="section-heading">
              <h2>Topic breakdown</h2>
              <span>{overview.topicBreakdown.length} topics attempted</span>
            </div>
            <div className="topic-table">
              {overview.topicBreakdown.map(topic => (
                <div className="topic-row interactive-row" key={topic.topic}>
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

function GaugeHero({ score, firstName, sessionCount, topicCount }) {
  const cardRef = useRef(null);
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function handleMove(event) {
    if (prefersReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    cardRef.current.style.setProperty('--tilt-x', `${(0.5 - y) * 10}deg`);
    cardRef.current.style.setProperty('--tilt-y', `${(x - 0.5) * 14}deg`);
    cardRef.current.style.setProperty('--glint-x', `${x * 100}%`);
    cardRef.current.style.setProperty('--glint-y', `${y * 100}%`);
  }

  function handleLeave() {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--tilt-x', '0deg');
    cardRef.current.style.setProperty('--tilt-y', '0deg');
  }

  return (
    <div
      className="gauge-panel gauge-3d"
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="gauge-wrap">
        <div className="dial-3d">
          <svg className="gauge-svg" viewBox="0 0 240 150" aria-hidden="true">
            <path className="gauge-bezel" d="M 22 130 A 98 98 0 0 1 218 130" />
            <path className="gauge-track" d="M 30 130 A 90 90 0 0 1 210 130" />
            <path
              className="gauge-fill"
              d="M 30 130 A 90 90 0 0 1 210 130"
              style={{
                '--score': score,
                '--score-color': getScoreColor(score)
              }}
            />
            <GaugeTicks />
          </svg>
          <div
            className="dial-needle"
            style={{ transform: `rotate(${-90 + (score / 100) * 180}deg)` }}
            aria-hidden="true"
          />
          <div className="gauge-readout">
            <div className="gauge-num">{score}</div>
            <div className="gauge-unit">Readiness / 100</div>
          </div>
        </div>
        <div className="gauge-zones">
          <div className="zone"><span className="zone-dot zone-red" />0-39</div>
          <div className="zone"><span className="zone-dot zone-amber" />40-69</div>
          <div className="zone"><span className="zone-dot zone-teal" />70-100</div>
        </div>
      </div>
      <div className="gauge-side">
        <p className="eyebrow">System status</p>
        <h1 className="gauge-title">{getStatusTitle(score, firstName)}</h1>
        <p className="gauge-desc">Built from your latest evaluated practice sessions.</p>
        <div className="dash-metrics">
          <div>
            <span>Sessions</span>
            <strong>{sessionCount}</strong>
          </div>
          <div>
            <span>Topics</span>
            <strong>{topicCount}</strong>
          </div>
        </div>
        <Link className="button primary cta" to="/interview/new">Start practice {'->'}</Link>
      </div>
    </div>
  );
}

function TopicList({ title, topics, tone }) {
  return (
    <section className="panel depth-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`status-label ${tone}`}>{tone === 'weak' ? 'Needs work' : 'Keep sharp'}</span>
      </div>
      <div className="mini-list">
        {topics.map(topic => (
          <div className="mini-item interactive-row" key={topic.topic}>
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

function getStatusTitle(score, firstName) {
  if (score >= 70) return `${firstName}, you're interview-ready.`;
  if (score >= 40) return `${firstName}, you're mid-calibration.`;
  return `${firstName}, needs focused reps.`;
}

import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await apiRequest('/api/analytics/overview', { token });
        if (!cancelled) {
          setOverview(data);
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
  const firstName = (user?.name || user?.email?.split('@')[0] || 'there').trim().split(/\s+/)[0];
  const hasEvaluatedSessions = (overview.evaluatedSessionCount || 0) > 0;

  return (
    <section className="page-stack dashboard-stage">
      <GaugeHero
        score={hasEvaluatedSessions ? overview.readinessScore : null}
        firstName={firstName}
        sessionCount={overview.evaluatedSessionCount || 0}
        topicCount={overview.topicBreakdown?.length || 0}
        hasEvaluatedSessions={hasEvaluatedSessions}
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

          <PerformanceHistory points={overview.performanceHistory || []} />

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

function PerformanceHistory({ points }) {
  if (points.length === 0) return null;
  const width = 640;
  const height = 230;
  const padding = { top: 18, right: 24, bottom: 34, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: padding.top + ((100 - point.score) / 100) * plotHeight
  }));
  const line = coordinates.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <section className="panel performance-panel">
      <div className="section-heading">
        <div><h2>Performance history</h2><span>Session score over time</span></div>
        <span>{points.length} recent sessions</span>
      </div>
      <div className="performance-chart-wrap">
        <svg className="performance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Session scores over time, from 0 to 100">
          {[0, 50, 100].map(score => {
            const y = padding.top + ((100 - score) / 100) * plotHeight;
            return <g key={score}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text x="4" y={y + 4}>{score}</text></g>;
          })}
          {coordinates.length > 1 && <polyline className="performance-line" points={line} />}
          {coordinates.map((point, index) => (
            <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r="5">
              <title>{`${point.score} on ${formatChartDate(point.date)} · ${point.company} · ${point.role}`}</title>
            </circle>
          ))}
          <text className="performance-date" x={padding.left} y={height - 8}>{formatChartDate(coordinates[0].date)}</text>
          {coordinates.length > 1 && <text className="performance-date" x={width - padding.right} y={height - 8} textAnchor="end">{formatChartDate(coordinates[coordinates.length - 1].date)}</text>}
        </svg>
      </div>
    </section>
  );
}

function formatChartDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value));
}

function GaugeHero({ score, firstName, sessionCount, topicCount, hasEvaluatedSessions }) {
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
                '--score': score ?? 0,
                '--score-color': getScoreColor(score)
              }}
            />
            <GaugeTicks />
          </svg>
          <div
            className="dial-needle"
            style={{ transform: `rotate(${-90 + ((score ?? 0) / 100) * 180}deg)` }}
            aria-hidden="true"
          />
          <div className="gauge-readout">
            <div className="gauge-num">{hasEvaluatedSessions ? score : '-'}</div>
            <div className="gauge-unit">{hasEvaluatedSessions ? 'Readiness / 100' : 'No score yet'}</div>
          </div>
        </div>
        <div className="gauge-zones">
          <div className="zone"><span className="zone-dot zone-red" />0-39</div>
          <div className="zone"><span className="zone-dot zone-amber" />40-69</div>
          <div className="zone"><span className="zone-dot zone-teal" />70-100</div>
        </div>
      </div>
      <div className="gauge-side">
        <p className="eyebrow">{hasEvaluatedSessions ? 'System status' : 'Welcome'}</p>
        <h1 className="gauge-title">{hasEvaluatedSessions ? getStatusTitle(score, firstName) : 'Welcome, start your first round'}</h1>
        <p className="gauge-desc">{hasEvaluatedSessions ? 'Built from your latest evaluated practice sessions.' : 'Start a practice round to build your interview readiness profile.'}</p>
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
        <Link className="button primary cta" to="/interview/new">{hasEvaluatedSessions ? 'Start practice' : 'Start your first round'} {'->'}</Link>
      </div>
    </div>
  );
}

function TopicList({ title, topics, tone }) {
  const emptyMessage = tone === 'weak' ? 'No weak topics yet' : 'No strong topics yet';

  return (
    <section className="panel depth-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`status-label ${tone}`}>{tone === 'weak' ? 'Needs work' : 'Keep sharp'}</span>
      </div>
      <div className="mini-list">
        {topics.length === 0 ? (
          <div className="mini-item">
            <span>{emptyMessage}</span>
          </div>
        ) : (
          topics.map(topic => (
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
          ))
        )}
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

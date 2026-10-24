import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';
import Icon from '../components/Icon.jsx';
import { RESUME_ANALYZER_URL } from '../config/links.js';

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
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <LoadingState message="Loading your readiness profile..." />;
  if (error) return <ErrorState message={error} />;

  const topics = overview.topicBreakdown || [];
  const points = overview.performanceHistory || [];
  const evaluatedSessionCount = overview.evaluatedSessionCount || 0;
  const score = evaluatedSessionCount > 0 ? overview.readinessScore : null;
  const sortedTopics = [...topics].sort((a, b) => {
    if (a.avgScore == null) return b.avgScore == null ? 0 : 1;
    if (b.avgScore == null) return -1;
    return a.avgScore - b.avgScore;
  });
  const weakestTopic = sortedTopics.find(topic => Number.isFinite(topic.avgScore))?.topic;
  const name = (user?.name || '').trim();
  const headline = !name || name.toLowerCase() === 'user' ? 'Welcome back' : `Welcome, ${name.split(/\s+/)[0]}`;

  return (
    <section className="page-stack dashboard-stage">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">Your practice overview</p>
          <h1>{headline}</h1>
        </div>
        <Link className="dashboard-heading-link" to="/interview/new">Start a mock interview <span aria-hidden="true">→</span></Link>
      </header>

      <section className="dashboard-readiness signature-card" aria-labelledby="dashboard-readiness-title">
        <div className="dashboard-readiness-main">
          <div className="dashboard-readiness-score">
            <p className="eyebrow">Interview readiness</p>
            <h2 id="dashboard-readiness-title" className="dashboard-score-number">
              {score == null ? '-' : score}<span>/100</span>
            </h2>
            <ReadinessVerdict score={score} />
            <ReadinessScale score={score} />
            <p className="dashboard-score-context">This score reflects your mock-interview practice.</p>
          </div>

          <div className="dashboard-stat-grid">
            <DashboardStat label={evaluatedSessionCount === 1 ? 'Session evaluated' : 'Sessions evaluated'} value={evaluatedSessionCount} icon="calendar" />
            <DashboardStat label={topics.length === 1 ? 'Topic practiced' : 'Topics practiced'} value={topics.length} icon="grid" />
            <DashboardStat label="Weakest topic" value={weakestTopic || '-'} icon="target" />
          </div>
        </div>

        <ReadinessExplainer />
      </section>

      <NextPracticeCard topic={weakestTopic} />
      <TopicsPanel topics={sortedTopics} />
      <PerformanceHistory points={points} />
      <ResumeToolCard />
    </section>
  );
}

function DashboardStat({ label, value, icon }) {
  return (
    <div className="dashboard-stat">
      <span className="dashboard-stat-icon"><Icon name={icon} /></span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ReadinessVerdict({ score }) {
  if (score == null) return <span className="readiness-chip neutral">No score yet</span>;
  if (score < 40) return <span className="readiness-chip danger">Not interview-ready yet</span>;
  if (score < 70) return <span className="readiness-chip warning">Getting there</span>;
  return <span className="readiness-chip success">Interview-ready</span>;
}

function ReadinessScale({ score }) {
  const clampedScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className={`readiness-scale${score == null ? ' is-empty' : ''}`} role="img" aria-label={score == null ? 'No readiness score yet' : `Score ${clampedScore} on a scale: 0 to 39 not ready, 40 to 69 getting there, 70 to 100 interview-ready`}>
      <div className="readiness-scale-track">
        <span /><span /><span />
        {score != null && <i style={{ '--readiness-position': `${clampedScore}%` }} />}
      </div>
      <div className="readiness-scale-labels"><span>Not ready</span><span>Getting there</span><span>Interview-ready</span></div>
    </div>
  );
}

function ReadinessExplainer() {
  const factors = [
    ['Recent session scores', 'The average of your last 5 evaluated sessions, 60% of the score.'],
    ['Topic coverage', 'Full at 10 different topics, 25% of the score.'],
    ['Improvement trend', '+5 if improving, -5 if declining.'],
    ['Target company', '+5 if you have practiced for your target company.']
  ];

  return (
    <aside className="readiness-explainer" aria-labelledby="readiness-explainer-title">
      <div className="readiness-explainer-heading">
        <span className="explainer-icon"><Icon name="bulb" /></span>
        <div><p className="eyebrow">The method</p><h3 id="readiness-explainer-title">What this score is based on</h3></div>
      </div>
      <ol className="readiness-factors">
        {factors.map(([title, detail], index) => (
          <li key={title}><span className="readiness-factor-index">0{index + 1}</span><div><strong>{title}</strong><p>{detail}</p></div></li>
        ))}
      </ol>
      <p className="readiness-note">Your resume analysis is a separate tool and is not part of this score.</p>
    </aside>
  );
}

function NextPracticeCard({ topic }) {
  return (
    <section className="panel dashboard-next-card">
      <div className="icon-tile dashboard-next-icon"><Icon name="chart" /></div>
      <div className="dashboard-next-copy">
        <p className="eyebrow">Best next step</p>
        <h2>{topic ? `Practice ${topic} next` : 'Start your first mock interview'}</h2>
        <p>{topic ? 'Focus on your lowest-scoring topic to build a more balanced readiness profile.' : 'Complete a mock interview to start building your readiness profile.'}</p>
      </div>
      <Link className="button primary dashboard-next-action" to="/interview/new">{topic ? `Practice ${topic}` : 'Start your first mock interview'}<span aria-hidden="true">→</span></Link>
    </section>
  );
}

function TopicsPanel({ topics }) {
  const allTopicsNew = topics.length > 0 && topics.every(topic => topic.totalAttempted < 2);

  return (
    <section className="panel dashboard-topics-panel" aria-labelledby="dashboard-topics-title">
      <div className="dashboard-section-heading">
        <div className="dashboard-section-heading-group">
          <span className="icon-tile dashboard-section-icon"><Icon name="grid" /></span>
          <div><p className="eyebrow">Coverage</p><h2 id="dashboard-topics-title">Your topics, weakest first</h2></div>
        </div>
        <div className="dashboard-topic-legend" aria-label="Score bands">
          <span><i className="danger-dot" />Under 60 weak</span>
          <span><i className="warning-dot" />60–79 solid</span>
          <span><i className="success-dot" />80+ strong</span>
        </div>
      </div>
      {topics.length === 0 ? (
        <div className="dashboard-topics-empty">
          <span className="icon-tile dashboard-empty-icon"><Icon name="clock" viewBox="0 0 48 48" /></span>
          <div><strong>Your topic scores will appear here</strong><p>Complete an evaluated mock interview to start tracking topic performance.</p></div>
          <Link className="button secondary" to="/interview/new">Start your first mock interview</Link>
        </div>
      ) : (
        <div className="dashboard-topic-list">
          {topics.map(topic => <TopicRow key={topic.topic} topic={topic} />)}
          {allTopicsNew && <p className="dashboard-trend-caption">Trends appear after 2 attempts per topic.</p>}
        </div>
      )}
    </section>
  );
}

function TopicRow({ topic }) {
  const score = topic.avgScore;
  const band = score == null ? 'neutral' : score < 60 ? 'danger' : score < 80 ? 'warning' : 'success';
  const bandLabel = score == null ? '-' : score < 60 ? 'Weak' : score < 80 ? 'Solid' : 'Strong';
  const hasTrend = topic.totalAttempted >= 2;
  const width = score == null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <Link className="dashboard-topic-row" to={`/history?topic=${encodeURIComponent(topic.topic)}`}>
      <span className="dashboard-topic-name">{topic.topic}</span>
      <span className={`dashboard-topic-bar${score === 0 ? ' is-zero' : ''}`} aria-hidden="true"><i className={band} style={{ width: `${width}%` }} /></span>
      <strong className="dashboard-topic-score">{score == null ? '-' : score}</strong>
      <span className={`dashboard-topic-chip ${band}`}>{bandLabel}</span>
      {hasTrend && <span className={`dashboard-trend-chip ${topic.trend}`}>{capitalizeTrend(topic.trend)}</span>}
      <span className="dashboard-topic-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}

function capitalizeTrend(trend) {
  if (trend === 'improving') return 'Improving';
  if (trend === 'declining') return 'Declining';
  return 'Stable';
}

function PerformanceHistory({ points }) {
  if (points.length < 2) {
    return (
      <section className="panel dashboard-performance" aria-labelledby="dashboard-performance-title">
        <div className="dashboard-section-heading">
          <div className="dashboard-section-heading-group">
            <span className="icon-tile dashboard-section-icon"><Icon name="chart" /></span>
            <div><p className="eyebrow">Momentum</p><h2 id="dashboard-performance-title">Progress over time</h2></div>
          </div>
          <span className="dashboard-session-count">{points.length} {points.length === 1 ? 'recent session' : 'recent sessions'}</span>
        </div>
        <div className="dashboard-trend-empty">
          <span className="dashboard-trend-icon"><Icon name="sparkline" viewBox="0 0 64 48" className="dashboard-sparkline" /></span>
          <div><strong>Your trend appears after your second session</strong><p>Complete one more evaluated mock interview to see how your scores are changing.</p></div>
        </div>
      </section>
    );
  }

  const width = 640;
  const height = 230;
  const padding = { top: 18, right: 24, bottom: 34, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (index / (points.length - 1)) * plotWidth,
    y: padding.top + ((100 - point.score) / 100) * plotHeight
  }));
  const line = coordinates.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <section className="panel dashboard-performance" aria-labelledby="dashboard-performance-title">
      <div className="dashboard-section-heading">
        <div className="dashboard-section-heading-group">
          <span className="icon-tile dashboard-section-icon"><Icon name="chart" /></span>
          <div><p className="eyebrow">Momentum</p><h2 id="dashboard-performance-title">Progress over time</h2></div>
        </div>
        <span className="dashboard-session-count">{points.length} {points.length === 1 ? 'recent session' : 'recent sessions'}</span>
      </div>
      <div className="performance-chart-wrap dashboard-chart-wrap">
        <svg className="performance-chart dashboard-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Session scores over time, from 0 to 100">
          <defs>
            <linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" className="dashboard-chart-stop" /><stop offset="100%" className="dashboard-chart-stop-end" /></linearGradient>
            <linearGradient id="dashboard-chart-stroke" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" className="dashboard-chart-line-start" /><stop offset="100%" className="dashboard-chart-line-end" /></linearGradient>
          </defs>
          {[0, 50, 100].map(value => {
            const y = padding.top + ((100 - value) / 100) * plotHeight;
            return <g key={value}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text x="4" y={y + 4}>{value}</text></g>;
          })}
          <polygon className="dashboard-chart-area" points={`${padding.left},${height - padding.bottom} ${line} ${width - padding.right},${height - padding.bottom}`} />
          <polyline className="performance-line" points={line} />
          {coordinates.map((point, index) => (
            <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r="5"><title>{`${point.score} on ${formatChartDate(point.date)} · ${point.company} · ${point.role}`}</title></circle>
          ))}
          <text className="performance-date" x={padding.left} y={height - 8}>{formatChartDate(coordinates[0].date)}</text>
          <text className="performance-date" x={width - padding.right} y={height - 8} textAnchor="end">{formatChartDate(coordinates[coordinates.length - 1].date)}</text>
        </svg>
      </div>
    </section>
  );
}

function formatChartDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value));
}

function ResumeToolCard() {
  return (
    <section className="dashboard-resume-card" aria-labelledby="dashboard-resume-title">
      <div className="icon-tile dashboard-resume-icon"><Icon name="document" /></div>
      <div className="dashboard-resume-copy">
        <p className="eyebrow">Separate tool</p>
        <h2 id="dashboard-resume-title">Resume analyzer</h2>
        <p>Check your resume against a job description. This does not change your interview readiness score.</p>
      </div>
      <a className="button secondary dashboard-resume-action" href={RESUME_ANALYZER_URL} target="_blank" rel="noopener noreferrer">Analyze my resume<span aria-hidden="true">↗</span></a>
    </section>
  );
}

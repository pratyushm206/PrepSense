import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';
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
        <Link className="button secondary dashboard-heading-action" to="/interview/new">Start a mock interview</Link>
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
            <DashboardStat label="Sessions evaluated" value={evaluatedSessionCount} icon="sessions" />
            <DashboardStat label="Topics practiced" value={topics.length} icon="topics" />
            <DashboardStat label="Weakest topic" value={weakestTopic || '-'} icon="focus" />
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
      <span className="dashboard-stat-icon" aria-hidden="true"><StatIcon name={icon} /></span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatIcon({ name }) {
  const paths = {
    sessions: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4m8-4v4M3 9h18M8 14h3m-3 3h7" /></>,
    topics: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="3" /></>,
    focus: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m12 12 6-6" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
        <span className="explainer-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a7 7 0 0 0-4 12.75c.6.42 1 1.02 1 1.75h6c0-.73.4-1.33 1-1.75A7 7 0 0 0 12 3Z"/><path d="M9 21h6m-5-3v-2m4 2v-2" /></svg></span>
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
      <div className="dashboard-next-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V6m0 12h16M8 15l3-4 3 2 5-7" /><path d="M16 6h3v3" /></svg></div>
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
  return (
    <section className="panel dashboard-topics-panel" aria-labelledby="dashboard-topics-title">
      <div className="dashboard-section-heading">
        <div><p className="eyebrow">Coverage</p><h2 id="dashboard-topics-title">Your topics, weakest first</h2></div>
        <div className="dashboard-topic-legend" aria-label="Score bands">
          <span><i className="danger-dot" />Under 60 weak</span>
          <span><i className="warning-dot" />60–79 solid</span>
          <span><i className="success-dot" />80+ strong</span>
        </div>
      </div>
      {topics.length === 0 ? (
        <div className="dashboard-topics-empty">
          <span className="dashboard-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="24" r="17"/><path d="M24 14v11l7 4M9 8l5 3m25-3-5 3" /></svg></span>
          <div><strong>Your topic scores will appear here</strong><p>Complete an evaluated mock interview to start tracking topic performance.</p></div>
          <Link className="button secondary" to="/interview/new">Start your first mock interview</Link>
        </div>
      ) : (
        <div className="dashboard-topic-list">
          {topics.map(topic => <TopicRow key={topic.topic} topic={topic} />)}
        </div>
      )}
    </section>
  );
}

function TopicRow({ topic }) {
  const score = topic.avgScore;
  const band = score == null ? 'neutral' : score < 60 ? 'danger' : score < 80 ? 'warning' : 'success';
  const bandLabel = score == null ? '-' : score < 60 ? 'Weak' : score < 80 ? 'Solid' : 'Strong';
  const trend = topic.totalAttempted < 2 ? 'New' : capitalizeTrend(topic.trend);
  const width = score == null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <Link className="dashboard-topic-row" to={`/history?topic=${encodeURIComponent(topic.topic)}`}>
      <span className="dashboard-topic-name">{topic.topic}</span>
      <span className="dashboard-topic-bar" aria-hidden="true"><i className={band} style={{ width: `${width}%` }} /></span>
      <strong className="dashboard-topic-score">{score == null ? '-' : score}</strong>
      <span className={`dashboard-topic-chip ${band}`}>{bandLabel}</span>
      <span className={`dashboard-trend-chip ${trend.toLowerCase()}`}>{trend}</span>
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
          <div><p className="eyebrow">Momentum</p><h2 id="dashboard-performance-title">Progress over time</h2></div>
          <span className="dashboard-session-count">{points.length} {points.length === 1 ? 'recent session' : 'recent sessions'}</span>
        </div>
        <div className="dashboard-trend-empty">
          <span className="dashboard-trend-icon" aria-hidden="true"><svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 39h54M8 34l13-12 10 7 15-18 10 8"/><circle cx="21" cy="22" r="2"/><circle cx="31" cy="29" r="2"/><circle cx="46" cy="11" r="2"/></svg></span>
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
        <div><p className="eyebrow">Momentum</p><h2 id="dashboard-performance-title">Progress over time</h2></div>
        <span className="dashboard-session-count">{points.length} recent sessions</span>
      </div>
      <div className="performance-chart-wrap dashboard-chart-wrap">
        <svg className="performance-chart dashboard-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Session scores over time, from 0 to 100">
          <defs><linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" className="dashboard-chart-stop" /><stop offset="100%" className="dashboard-chart-stop-end" /></linearGradient></defs>
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
      <div className="dashboard-resume-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 14h6m-6 4h6" /></svg></div>
      <div className="dashboard-resume-copy">
        <p className="eyebrow">Separate tool</p>
        <h2 id="dashboard-resume-title">Resume analyzer</h2>
        <p>Check your resume against a job description. This does not change your interview readiness score.</p>
      </div>
      <a className="button secondary dashboard-resume-action" href={RESUME_ANALYZER_URL} target="_blank" rel="noopener noreferrer">Analyze my resume<span aria-hidden="true">↗</span></a>
    </section>
  );
}

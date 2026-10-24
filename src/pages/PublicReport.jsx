import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { ErrorState, LoadingState } from '../components/Status.jsx';

export default function PublicReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const data = await apiRequest(`/api/public/report/${token}`);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <LoadingState message="Opening shared report..." />;
  if (error || !report) return <ErrorState message={error || 'Report not found.'} />;

  return (
    <main className="public-report">
      <section className="public-report-shell">
        <div className="summary-hero public-report-hero">
          <div>
            <p className="eyebrow">{report.company} readiness report</p>
            <h1 className={`score-badge large-score ${getScoreClass(report.score)}`}>{formatScore(report.score)}</h1>
            <p>{report.role} - {report.questionCount} {report.questionCount === 1 ? 'question' : 'questions'} - {formatDate(report.completedAt)}</p>
          </div>
          <Link className="button secondary" to="/">PrepSense</Link>
        </div>

        <section className="panel">
          <div className="section-heading">
            <h2>Topic breakdown</h2>
            <span>Sanitized public view</span>
          </div>
          <div className="topic-table">
            {(report.topicBreakdown || []).map(topic => (
              <div className="topic-row" key={topic.topic}>
                <div>
                  <strong>{topic.topic}</strong>
                  <span>{topic.totalAttempted || 0} {(topic.totalAttempted || 0) === 1 ? 'answer' : 'answers'}</span>
                </div>
                <div className="topic-score-wrap">
                  <span className="topic-bar">
                    <span
                      className="topic-bar-fill"
                      style={{
                        width: `${getScorePercent(topic.avgScore)}%`,
                        background: getScoreColor(topic.avgScore)
                      }}
                    />
                  </span>
                  <strong>{formatScore(topic.avgScore)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function getScoreColor(score = 0) {
  if (score >= 70) return 'var(--teal)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}

function getScorePercent(score) {
  if (score === null || score === undefined) return 0;
  return Math.max(0, Math.min(100, score));
}

function getScoreClass(score) {
  if (score === null || score === undefined) return 'score-zero';
  if (score >= 80) return 'score-good';
  if (score >= 60) return 'score-warn';
  return 'score-bad';
}

function formatScore(score) {
  return score === null || score === undefined ? '-' : score;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

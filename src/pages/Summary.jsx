import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';

export default function Summary() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const data = await apiRequest(`/api/sessions/${sessionId}`, { token });
        if (!cancelled) setSession(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const latestAnswers = useLatestAnswers(session);

  if (loading) return <LoadingState message="Building your session summary..." />;
  if (error || !session) return <ErrorState message={error || 'Session not found.'} />;

  async function handleShare() {
    try {
      setSharing(true);
      const data = await apiRequest(`/api/sessions/${sessionId}/share`, {
        method: 'POST',
        token
      });
      const nextLink = `${window.location.origin}${data.path}`;
      setShareLink(nextLink);
      setShareMessage('Share link copied');
      await navigator.clipboard?.writeText(nextLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setSharing(false);
    }
  }

  async function handleRevokeShare() {
    try {
      setRevoking(true);
      await apiRequest(`/api/sessions/${sessionId}/share`, { method: 'DELETE', token });
      setShareLink('');
      setShareMessage('Share link revoked');
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="summary-hero">
        <div>
          <p className="eyebrow">{session.company} interview summary</p>
          <h1 className={`score-badge large-score ${getScoreClass(session.overallScore)}`}>{formatScore(session.overallScore)}</h1>
          <p className="muted">Difficulty-adjusted overall score</p>
          <p>{session.role} - {latestAnswers.length} answered {latestAnswers.length === 1 ? 'question' : 'questions'}</p>
        </div>
        <div className="action-row">
          <button className="button secondary" type="button" onClick={handleShare} disabled={sharing}>
            {sharing ? 'Creating link...' : 'Share report'}
          </button>
          <Link className="button secondary" to="/interview/new">Try again</Link>
          <Link className="button primary" to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
      {shareLink && (
        <div className="share-strip">
          <span>{shareMessage || 'Share link copied'}</span>
          <a href={shareLink} target="_blank" rel="noopener noreferrer">{shareLink}</a>
          <button className="button ghost" type="button" onClick={handleRevokeShare} disabled={revoking}>
            {revoking ? 'Revoking...' : 'Revoke link'}
          </button>
        </div>
      )}
      {!shareLink && shareMessage && <div className="share-strip"><span>{shareMessage}</span></div>}

      <section className="question-breakdown">
        {session.questions.map(question => {
          const answer = latestAnswers.find(item => item.questionId === question.id);
          return (
            <article className="panel qa-card" key={question.id}>
              <div className="question-meta">
                <Link className="tag" to={`/history?topic=${encodeURIComponent(question.topic || '')}`}>{question.topic}</Link>
                <span className="tag">{question.difficulty}</span>
                {answer && <strong>Raw score: {formatScore(answer.score)}/100</strong>}
              </div>
              <h2>{question.question}</h2>
              {answer ? (
                <>
                  <p>{answer.text}</p>
                  <div className="grid two feedback-grid">
                    <Feedback title="Strengths" tone="success" items={answer.strengths} />
                    <Feedback title="Improvements" tone="warning" items={answer.improvements} />
                    <Feedback title="Missed points" tone="danger" items={answer.missedPoints} />
                  </div>
                </>
              ) : (
                <p className="muted">No answer submitted for this question.</p>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}

function useLatestAnswers(session) {
  return useMemo(() => {
    const latest = new Map();
    (session?.answers || []).filter(answer => answer.isLatest !== false).forEach(answer => {
      latest.set(answer.questionId, answer);
    });
    return Array.from(latest.values());
  }, [session]);
}

function formatScore(score) {
  return score === null || score === undefined ? '-' : score;
}

function getScoreClass(score) {
  if (score === null || score === undefined) return 'score-zero';
  if (score >= 80) return 'score-good';
  if (score >= 60) return 'score-warn';
  return 'score-bad';
}

function Feedback({ title, tone, items = [] }) {
  if (items.length === 0) return null;
  return (
    <div className={`feedback-list compact ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

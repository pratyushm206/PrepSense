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

  return (
    <section className="page-stack">
      <div className="summary-hero">
        <div>
          <p className="eyebrow">{session.company} interview summary</p>
          <h1>{session.overallScore || calculateLocalAverage(session, latestAnswers)}</h1>
          <p>{session.role} - {latestAnswers.length} answered questions</p>
        </div>
        <div className="action-row">
          <Link className="button secondary" to="/interview/new">Try again</Link>
          <Link className="button primary" to="/dashboard">Back to dashboard</Link>
        </div>
      </div>

      <section className="question-breakdown">
        {session.questions.map(question => {
          const answer = latestAnswers.find(item => item.questionId === question.id);
          return (
            <article className="panel qa-card" key={question.id}>
              <div className="question-meta">
                <span className="tag">{question.topic}</span>
                <span className="tag">{question.difficulty}</span>
                {answer && <strong>{answer.score}/100</strong>}
              </div>
              <h2>{question.question}</h2>
              {answer ? (
                <>
                  <p>{answer.text}</p>
                  <div className="grid three">
                    <Feedback title="Strengths" items={answer.strengths} />
                    <Feedback title="Improvements" items={answer.improvements} />
                    <Feedback title="Missed points" items={answer.missedPoints} />
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

function calculateLocalAverage(session, answers) {
  if (!answers.length) return 0;
  const total = answers.reduce((sum, answer) => sum + Number(answer.score || 0), 0);
  return Math.round(total / answers.length);
}

function Feedback({ title, items = [] }) {
  return (
    <div className="feedback-list compact">
      <h3>{title}</h3>
      <ul>
        {items.length === 0
          ? <li>No notes returned.</li>
          : items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

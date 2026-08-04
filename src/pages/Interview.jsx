import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from '../components/Status.jsx';

export default function Interview() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
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

  const question = session?.questions?.[currentIndex];
  const latestAnswer = useMemo(() => {
    if (!question) return null;
    return [...(session.answers || [])].reverse().find(answer =>
      answer.questionId === question.id && answer.isLatest !== false
    );
  }, [question, session]);

  useEffect(() => {
    if (latestAnswer) {
      setAnswerText(latestAnswer.text);
      setResult(latestAnswer);
    } else {
      setAnswerText('');
      setResult(null);
    }
  }, [currentIndex, latestAnswer]);

  async function submitAnswer(event) {
    event.preventDefault();
    if (!answerText.trim()) {
      setError('Write an answer before submitting.');
      return;
    }

    try {
      setError('');
      setEvaluating(true);
      const evaluation = await apiRequest('/api/answers/evaluate', {
        method: 'POST',
        token,
        body: {
          sessionId,
          questionId: question.id,
          answerText: answerText.trim()
        }
      });
      setResult(evaluation);
      setSession(prev => ({
        ...prev,
        answers: [
          ...(prev.answers || []).map(answer =>
            answer.questionId === question.id ? { ...answer, isLatest: false } : answer
          ),
          { ...evaluation, questionId: question.id, text: answerText.trim(), isLatest: true }
        ]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  }

  function goNext() {
    if (currentIndex === session.questions.length - 1) {
      navigate(`/interview/${sessionId}/summary`);
      return;
    }
    setCurrentIndex(currentIndex + 1);
  }

  if (loading) return <LoadingState message="Opening your interview..." />;
  if (!session || error && !question) return <ErrorState message={error || 'Session not found.'} />;

  return (
    <section className="interview-layout">
      <aside className="question-rail">
        <p className="eyebrow">{session.company}</p>
        <h1>{session.role}</h1>
        <div className="progress-list">
          {session.questions.map((item, index) => (
            <button
              key={item.id}
              className={index === currentIndex ? 'active' : ''}
              type="button"
              onClick={() => setCurrentIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </aside>

      <section className="panel interview-panel">
        <div className="question-meta">
          <span>Question {currentIndex + 1} of {session.questions.length}</span>
          <span className="tag">{question.topic}</span>
          <span className="tag">{question.difficulty}</span>
        </div>
        <h2>{question.question}</h2>

        <form className="form-stack" onSubmit={submitAnswer}>
          {error && <div className="field-error form-error">{error}</div>}
          <label>
            Your answer
            <textarea
              value={answerText}
              onChange={event => setAnswerText(event.target.value)}
              rows="9"
              placeholder="Think out loud, then structure your final answer here."
            />
          </label>
          <div className="action-row">
            <button className="button secondary" type="submit" disabled={evaluating}>
              {result ? 'Redo evaluation' : evaluating ? 'Evaluating...' : 'Submit answer'}
            </button>
            {result && (
              <button className="button primary" type="button" onClick={goNext}>
                {currentIndex === session.questions.length - 1 ? 'View summary' : 'Next question'}
              </button>
            )}
          </div>
        </form>

        {result && (
          <section className="result-panel">
            <div className="score-pill">
              <span>Score</span>
              <strong>{result.score}</strong>
            </div>
            <span className={`verdict ${result.verdict}`}>{result.verdict}</span>
            <FeedbackList title="Strengths" items={result.strengths} />
            <FeedbackList title="Improvements" items={result.improvements} />
            <FeedbackList title="Missed points" items={result.missedPoints} />
          </section>
        )}
      </section>
    </section>
  );
}

function FeedbackList({ title, items = [] }) {
  return (
    <div className="feedback-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">No notes returned.</p>
      ) : (
        <ul>
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

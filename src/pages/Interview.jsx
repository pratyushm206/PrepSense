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
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [retrying, setRetrying] = useState(false);
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
  const isMcq = question?.type === 'mcq' || question?.type === 'dsa-mcq';
  const latestAnswer = useMemo(() => {
    if (!question) return null;
    return [...(session.answers || [])].reverse().find(answer =>
      answer.questionId === question.id && answer.isLatest !== false
    );
  }, [question, session]);

  useEffect(() => {
    if (latestAnswer) {
      setAnswerText(latestAnswer.text);
      const savedOptionIndex = question?.options?.findIndex(option => option === latestAnswer.text) ?? -1;
      setSelectedOptionIndex(savedOptionIndex >= 0 ? savedOptionIndex : null);
      setResult(latestAnswer);
    } else {
      setAnswerText('');
      setSelectedOptionIndex(null);
      setResult(null);
    }
  }, [currentIndex, latestAnswer, question]);

  async function submitAnswer(event) {
    event.preventDefault();
    if (isMcq ? selectedOptionIndex === null : !answerText.trim()) {
      setError(isMcq ? 'Select an answer before submitting.' : 'Write an answer before submitting.');
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
          ...(isMcq
            ? { selectedOptionIndex }
            : { answerText: answerText.trim() })
        }
      });
      setResult(evaluation);
      setSession(prev => ({
        ...prev,
        answers: [
          ...(prev.answers || []).map(answer =>
            answer.questionId === question.id ? { ...answer, isLatest: false } : answer
          ),
          { ...evaluation, questionId: question.id, text: isMcq ? question.options[selectedOptionIndex] : answerText.trim(), isLatest: true }
        ]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  }

  async function retryFailedEvaluation() {
    if (!result?._id) return;
    try {
      setError('');
      setRetrying(true);
      const evaluation = await apiRequest(`/api/answers/${sessionId}/${result._id}/retry`, {
        method: 'POST',
        token
      });
      setResult(evaluation);
      setSession(prev => ({
        ...prev,
        answers: [
          ...(prev.answers || []).map(answer =>
            answer.questionId === question.id ? { ...answer, isLatest: false } : answer
          ),
          { ...evaluation, questionId: question.id, text: result.text, isLatest: true }
        ]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
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
              aria-label={`Go to question ${index + 1}`}
              aria-current={index === currentIndex ? 'step' : undefined}
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

        {question.type === 'dsa-subjective' && <DsaDetails question={question} />}

        <form className="form-stack" onSubmit={submitAnswer}>
          {error && <div className="field-error form-error">{error}</div>}
          {isMcq ? (
            <fieldset className="mcq-options">
              <legend>Select one answer</legend>
              {(question.options || []).map((option, index) => (
                <label className={selectedOptionIndex === index ? 'mcq-option selected' : 'mcq-option'} key={`${index}-${option}`}>
                  <input
                    type="radio"
                    name={`answer-${question.id}`}
                    value={index}
                    checked={selectedOptionIndex === index}
                    onChange={() => setSelectedOptionIndex(index)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label>
              Your answer
              <textarea
                className={question.type === 'dsa-subjective' ? 'dsa-answer' : undefined}
                value={answerText}
                maxLength={5000}
                onChange={event => setAnswerText(event.target.value)}
                rows="9"
                placeholder="Think out loud, then structure your final answer here."
              />
            </label>
          )}
          <div className="action-row">
            <button className="button secondary" type="submit" disabled={evaluating}>
              {result ? 'Redo evaluation' : evaluating ? 'Evaluating...' : 'Submit answer'}
            </button>
            {result && result.evaluationStatus !== 'failed' && (
              <button className="button primary" type="button" onClick={goNext}>
                {currentIndex === session.questions.length - 1 ? 'View summary' : 'Next question'}
              </button>
            )}
          </div>
        </form>

        {result?.evaluationStatus === 'failed' ? (
          <section className="result-panel evaluation-failed" role="status">
            <h3>Evaluation could not be completed</h3>
            <p>{result.failureReason || 'The AI evaluator is busy. Try again in a minute.'}</p>
            <button className="button secondary" type="button" onClick={retryFailedEvaluation} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry evaluation'}
            </button>
          </section>
        ) : result && (
          <section className="result-panel">
            <div className="score-pill">
              <span>Score</span>
              <strong>{result.score ?? '-'}</strong>
            </div>
            <span className={`verdict ${result.verdict || 'pending'}`}>
              {result.verdict || 'Not evaluated'}
            </span>
            <FeedbackList title="Strengths" items={result.strengths} />
            <FeedbackList title="Improvements" items={result.improvements} />
            <FeedbackList title="Missed points" items={result.missedPoints} />
            {isMcq && (
              <div className="feedback-list">
                <h3>Explanation</h3>
                <p>{question.explanation || result.explanation || 'No explanation provided.'}</p>
                <p><strong>Correct answer:</strong> {question.options?.[question.correctOptionIndex]}</p>
              </div>
            )}
          </section>
        )}
      </section>
    </section>
  );
}

function DsaDetails({ question }) {
  return (
    <div className="dsa-details">
      {question.problemStatement && <p className="dsa-problem">{question.problemStatement}</p>}
      {question.examples?.length > 0 && (
        <section>
          <h3>Examples</h3>
          {question.examples.map((example, index) => (
            <article className="dsa-example" key={`${index}-${example.input}`}>
              <strong>Example {index + 1}</strong>
              <p><span>Input</span><code>{example.input}</code></p>
              <p><span>Output</span><code>{example.output}</code></p>
              {example.explanation && <p className="muted">{example.explanation}</p>}
            </article>
          ))}
        </section>
      )}
      {(question.inputFormat || question.outputFormat) && (
        <section className="dsa-formats">
          {question.inputFormat && <p><strong>Input:</strong> {question.inputFormat}</p>}
          {question.outputFormat && <p><strong>Output:</strong> {question.outputFormat}</p>}
        </section>
      )}
      {question.constraints?.length > 0 && (
        <section><h3>Constraints</h3><ul>{question.constraints.map(item => <li key={item}><code>{item}</code></li>)}</ul></section>
      )}
      {question.glossary?.length > 0 && (
        <section><h3>Glossary</h3><dl>{question.glossary.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
      )}
    </div>
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

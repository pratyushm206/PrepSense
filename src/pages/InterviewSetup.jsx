import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = [
  { value: 'dsa', label: 'DSA' },
  { value: 'system_design', label: 'System design' },
  { value: 'core', label: 'Core subjects' },
  { value: 'behavioral', label: 'Behavioral' }
];

export default function InterviewSetup() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState({
    company: searchParams.get('company') || '',
    role: '',
    category: searchParams.get('category') || '',
    difficulty: 'medium',
    count: 5,
    mode: 'subjective',
    mcqCount: 5,
    subjectiveCount: 2
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [readout, setReadout] = useState({
    sessionsThisWeek: '—',
    readinessScore: '—',
    recommendedFocus: '—'
  });
  const [readoutLoading, setReadoutLoading] = useState(true);
  const [readoutError, setReadoutError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReadout() {
      try {
        const [overview, recommendations] = await Promise.all([
          apiRequest('/api/analytics/overview', { token }),
          apiRequest('/api/recommendations', { token })
        ]);

        if (!cancelled) {
          setReadout({
            sessionsThisWeek: overview.sessionsThisWeek ?? '—',
            readinessScore: overview.readinessScore ?? '—',
            recommendedFocus: getRecommendedFocus(recommendations)
          });
        }
      } catch (err) {
        if (!cancelled) setReadoutError(err.message);
      } finally {
        if (!cancelled) setReadoutLoading(false);
      }
    }

    loadReadout();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateField(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: '' });
  }

  function setChoice(name, value) {
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  function validate() {
    const nextErrors = {};
    if (!values.company.trim()) nextErrors.company = 'Company is required.';
    if (!values.role.trim()) nextErrors.role = 'Role is required.';
    if (!values.category) nextErrors.category = 'Pick what you want to practice.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    let sessionIdForCleanup = null;
    try {
      setLoading(true);
      const session = await apiRequest('/api/sessions', {
        method: 'POST',
        token,
        body: {
          company: values.company.trim(),
          role: values.role.trim(),
          mode: values.mode,
          config: {
            mcqCount: values.mode === 'subjective' ? 0 : Number(values.mcqCount),
            subjectiveCount: values.mode === 'mcq' ? 0 : Number(values.subjectiveCount)
          }
        }
      });
      sessionIdForCleanup = session._id;

      await apiRequest('/api/questions/generate', {
        method: 'POST',
        token,
        body: {
          sessionId: session._id,
          company: values.company.trim(),
          role: values.role.trim(),
          category: values.category,
          difficulty: values.difficulty,
          mode: values.mode,
          count: Number(values.count),
          mcqCount: Number(values.mcqCount),
          subjectiveCount: Number(values.subjectiveCount)
        }
      });

      navigate(`/interview/${session._id}`);
    } catch (error) {
      if (sessionIdForCleanup) {
        await apiRequest(`/api/sessions/${sessionIdForCleanup}/empty`, { method: 'DELETE', token }).catch(() => {});
      }
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="practice-layout">
      <div className="practice-copy">
        <div className="practice-hero signature-card">
          <p className="eyebrow">New round</p>
          <h1>Set the conditions,<br />then <span>go in cold.</span></h1>
          <p className="lead">
            Subjective question sets with the same company, role, difficulty, count, and category are
            shared and reused for up to 24 hours to keep rounds fast.
          </p>
        </div>
        <div className="readout-strip" aria-label={readoutError || undefined}>
          <div className="readout">
            <span className="readout-val">{readoutLoading ? '...' : readout.sessionsThisWeek}</span>
            <span className="readout-label">Sessions this week</span>
          </div>
          <div className="readout">
            <span className="readout-val">{readoutLoading ? '...' : readout.readinessScore}</span>
            <span className="readout-label">Current readiness</span>
          </div>
          <div className="readout">
            <span className="readout-val">{readoutLoading ? '...' : readout.recommendedFocus}</span>
            <span className="readout-label">Recommended focus</span>
          </div>
        </div>
      </div>

      <form className="panel setup-panel form-stack" onSubmit={handleSubmit}>
        {formError && <div className="field-error form-error">{formError}</div>}
        <label className="field">
          <span>Company</span>
          <input name="company" maxLength={80} value={values.company} onChange={updateField} placeholder="Microsoft" />
          {errors.company && <span className="field-error">{errors.company}</span>}
        </label>
        <label className="field">
          <span>Role</span>
          <input name="role" maxLength={80} value={values.role} onChange={updateField} placeholder="Software Engineer Intern" />
          {errors.role && <span className="field-error">{errors.role}</span>}
        </label>
        <div className="field">
          <span className="field-label">What do you want to practice?</span>
          <div className="chip-row" role="group" aria-label="Category">
            {CATEGORIES.map(option => (
              <button
                className={`chip ${values.category === option.value ? 'selected' : ''}`}
                type="button"
                aria-pressed={values.category === option.value}
                onClick={() => setChoice('category', option.value)}
                key={option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>
        <div className="field">
          <span className="field-label">Difficulty</span>
          <div className="chip-row" role="group" aria-label="Difficulty">
            {['easy', 'medium', 'hard'].map(option => (
              <button
                className={`chip ${values.difficulty === option ? 'selected' : ''}`}
                type="button"
                aria-pressed={values.difficulty === option}
                onClick={() => setChoice('difficulty', option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Question mode</span>
          <div className="chip-row" role="group" aria-label="Question mode">
            {[
              ['subjective', 'Written'],
              ['mcq', 'Multiple choice'],
              ['mixed', 'Mixed']
            ].map(([value, label]) => (
              <button
                className={`chip ${values.mode === value ? 'selected' : ''}`}
                type="button"
                aria-pressed={values.mode === value}
                onClick={() => setChoice('mode', value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {values.mode === 'mixed' ? (
          <>
            <CountChoice label="Multiple-choice questions" name="mcqCount" value={values.mcqCount} onChange={setChoice} options={[2, 3, 5]} />
            <CountChoice label="Written questions" name="subjectiveCount" value={values.subjectiveCount} onChange={setChoice} options={[1, 2, 3]} />
          </>
        ) : (
        <div className="field">
          <span className="field-label">Questions</span>
          <div className="chip-row" role="group" aria-label="Questions">
            {[3, 5, 7].map(option => (
              <button
                className={`chip ${Number(values.count) === option ? 'selected' : ''}`}
                type="button"
                aria-pressed={Number(values.count) === option}
                onClick={() => setChoice('count', option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        )}
        <button className="button primary gen-btn" type="submit" disabled={loading}>
          {loading ? 'Generating questions...' : <>Generate interview {'->'}</>}
        </button>
        <div className="gen-note"><span className="dot" />AI-generated - takes ~10-15s</div>
      </form>
    </section>
  );
}

function getRecommendedFocus(data) {
  return data.recommendations?.[0]?.topic || data.weakTopics?.[0]?.topic || '—';
}

function CountChoice({ label, name, value, onChange, options }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chip-row" role="group" aria-label={label}>
        {options.map(option => (
          <button
            className={`chip ${Number(value) === option ? 'selected' : ''}`}
            type="button"
            aria-pressed={Number(value) === option}
            onClick={() => onChange(name, option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

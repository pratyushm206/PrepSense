import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function InterviewSetup() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    company: '',
    role: '',
    difficulty: 'medium',
    count: 5
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    try {
      setLoading(true);
      const session = await apiRequest('/api/sessions', {
        method: 'POST',
        token,
        body: {
          company: values.company.trim(),
          role: values.role.trim()
        }
      });

      await apiRequest('/api/questions/generate', {
        method: 'POST',
        token,
        body: {
          sessionId: session._id,
          company: values.company.trim(),
          role: values.role.trim(),
          difficulty: values.difficulty,
          count: Number(values.count)
        }
      });

      navigate(`/interview/${session._id}`);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="practice-layout">
      <div className="practice-copy">
        <div>
          <p className="eyebrow">New round</p>
          <h1>Set the conditions,<br />then <span>go in cold.</span></h1>
          <p className="lead">
            Every round is generated fresh for the company and role you pick - no repeats, no cached questions from someone else's run.
          </p>
        </div>
        <div className="readout-strip">
          <div className="readout"><span className="readout-val">2</span><span className="readout-label">Sessions this week</span></div>
          <div className="readout"><span className="readout-val">54</span><span className="readout-label">Current readiness</span></div>
          <div className="readout"><span className="readout-val">arrays</span><span className="readout-label">Recommended focus</span></div>
        </div>
      </div>

      <form className="panel setup-panel form-stack" onSubmit={handleSubmit}>
        {formError && <div className="field-error form-error">{formError}</div>}
        <label className="field">
          <span>Company</span>
          <input name="company" value={values.company} onChange={updateField} placeholder="Microsoft" />
          {errors.company && <span className="field-error">{errors.company}</span>}
        </label>
        <label className="field">
          <span>Role</span>
          <input name="role" value={values.role} onChange={updateField} placeholder="Software Engineer Intern" />
          {errors.role && <span className="field-error">{errors.role}</span>}
        </label>
        <div className="field">
          <span className="field-label">Difficulty</span>
          <div className="chip-row" role="group" aria-label="Difficulty">
            {['easy', 'medium', 'hard'].map(option => (
              <button
                className={`chip ${values.difficulty === option ? 'selected' : ''}`}
                type="button"
                onClick={() => setChoice('difficulty', option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Questions</span>
          <div className="chip-row" role="group" aria-label="Questions">
            {[3, 5, 7].map(option => (
              <button
                className={`chip ${Number(values.count) === option ? 'selected' : ''}`}
                type="button"
                onClick={() => setChoice('count', option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <button className="button primary gen-btn" type="submit" disabled={loading}>
          {loading ? 'Generating questions...' : <>Generate interview {'->'}</>}
        </button>
        <div className="gen-note"><span className="dot" />AI-generated - takes ~10-15s</div>
      </form>
    </section>
  );
}

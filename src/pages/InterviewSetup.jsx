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
    count: 3
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: '' });
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
    <section className="narrow-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">New interview</p>
          <h1>Set up a focused practice round.</h1>
        </div>
      </div>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        {formError && <div className="field-error form-error">{formError}</div>}
        <label>
          Company
          <input name="company" value={values.company} onChange={updateField} placeholder="Microsoft" />
          {errors.company && <span className="field-error">{errors.company}</span>}
        </label>
        <label>
          Role
          <input name="role" value={values.role} onChange={updateField} placeholder="Software Engineer Intern" />
          {errors.role && <span className="field-error">{errors.role}</span>}
        </label>
        <label>
          Difficulty
          <select name="difficulty" value={values.difficulty} onChange={updateField}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label>
          Questions
          <select name="count" value={values.count} onChange={updateField}>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? 'Generating questions...' : 'Generate interview'}
        </button>
      </form>
    </section>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    targetCompanies: ''
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
    if (!values.name.trim()) nextErrors.name = 'Name is required.';
    if (!values.email.includes('@')) nextErrors.email = 'Enter a valid email address.';
    if (values.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    const targetCompanies = values.targetCompanies
      .split(',')
      .map(company => company.trim())
      .filter(Boolean);

    try {
      setLoading(true);
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        targetCompanies
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel wide">
        <p className="eyebrow">PrepSense</p>
        <h1>Create your readiness workspace.</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          {formError && <div className="field-error form-error">{formError}</div>}
          <label>
            Name
            <input name="name" value={values.name} onChange={updateField} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label>
            Email
            <input name="email" type="email" value={values.email} onChange={updateField} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label>
            Password
            <input name="password" type="password" value={values.password} onChange={updateField} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <label>
            Target companies
            <input
              name="targetCompanies"
              placeholder="Google, Microsoft, Amazon"
              value={values.targetCompanies}
              onChange={updateField}
            />
            <span className="helper-text">Optional. Separate multiple companies with commas.</span>
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="muted">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}

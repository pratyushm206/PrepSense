import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: '' });
  }

  function validate() {
    const nextErrors = {};
    if (!values.email.includes('@')) nextErrors.email = 'Enter a valid email address.';
    if (!values.password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    try {
      setLoading(true);
      await login(values);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">PrepSense</p>
        <h1>Sign in to practice smarter.</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          {formError && <div className="field-error form-error">{formError}</div>}
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
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
      </section>
    </main>
  );
}

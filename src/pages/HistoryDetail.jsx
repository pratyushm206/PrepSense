import { Link, useNavigate, useParams } from 'react-router-dom';
import Summary from './Summary.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../api/client.js';
import { useState } from 'react';

export default function HistoryDetail() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteSession() {
    try {
      setDeleting(true);
      await apiRequest(`/api/sessions/${sessionId}`, { method: 'DELETE', token });
      window.dispatchEvent(new CustomEvent('prepsense:analytics-refresh'));
      navigate('/history', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <section className="page-stack">
      <Link className="button ghost fit" to="/history">Back to history</Link>
      {error && <p role="alert" className="field-error">{error}</p>}
      <button className="button danger-ghost fit" type="button" onClick={() => setConfirmDelete(true)}>Delete session</button>
      <Summary key={sessionId} />
      {confirmDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-detail-title">
            <h2 id="delete-detail-title">Delete this session?</h2>
            <p>This permanently deletes this session and its answers.</p>
            <div className="action-row">
              <button className="button danger" type="button" onClick={deleteSession} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete session'}</button>
              <button className="button ghost" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

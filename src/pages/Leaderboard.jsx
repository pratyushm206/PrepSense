import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const companyOptions = useMemo(() => user?.targetCompanies || [], [user]);
  const initialCompany = searchParams.get('company') || companyOptions[0] || '';
  const [company, setCompany] = useState(initialCompany);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialCompany));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!company) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadLeaderboard() {
      try {
        setError('');
        setLoading(true);
        const data = await apiRequest(`/api/leaderboard/${encodeURIComponent(company)}`, { token });
        if (!cancelled) setLeaderboard(data.leaderboard || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [company, token]);

  function chooseCompany(nextCompany) {
    setCompany(nextCompany);
    setSearchParams(nextCompany ? { company: nextCompany } : {});
  }

  if (!company) {
    return (
      <EmptyState
        title="Pick a target company first"
        message="Add target companies to your profile, then compare readiness scores across practice sessions."
        action={<Link className="button primary" to="/profile">Update profile</Link>}
      />
    );
  }

  return (
    <section className="page-stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h1>{company} readiness.</h1>
        </div>
        <div className="chip-row" role="group" aria-label="Company leaderboard">
          {companyOptions.map(option => (
            <button
              className={`chip ${company === option ? 'selected' : ''}`}
              key={option}
              onClick={() => chooseCompany(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState message="Loading leaderboard..." />}
      {!loading && !error && leaderboard.length === 0 && (
        <EmptyState
          title="No scores yet"
          message="Completed sessions with scored answers will appear here."
          action={<Link className="button primary" to="/interview/new">Practice now</Link>}
        />
      )}
      {!loading && !error && leaderboard.length > 0 && (
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <article className="leaderboard-row" key={`${entry.username}-${index}`}>
              <span className="leaderboard-rank">{index + 1}</span>
              <div>
                <strong>{entry.username || 'PrepSense user'}</strong>
                <span>Best readiness score</span>
              </div>
              <div className={`score-badge ${getScoreClass(entry.score)}`}>{entry.score}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getScoreClass(score) {
  if (!score) return 'score-zero';
  if (score >= 70) return 'score-good';
  if (score >= 40) return 'score-warn';
  return 'score-bad';
}

import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';

export default function Recommendations() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      try {
        const nextData = await apiRequest('/api/recommendations', { token });
        if (!cancelled) setData(nextData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <LoadingState message="Loading recommendations..." />;
  if (error) return <ErrorState message={error} />;

  const recommendations = data?.recommendations || [];
  const weakTopics = data?.weakTopics || [];
  const companyFocusTopics = data?.companyFocusTopics || [];

  return (
    <section className="page-stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Study plan</p>
          <h1>What to focus on next.</h1>
          <p className="lead">Built from your weak topics and what your target company actually asks.</p>
        </div>
        {data?.targetCompany && (
          <span className="filter-chip active">{data.targetCompany}</span>
        )}
      </div>

      {!data?.targetCompany && (
        <div className="empty-hint">
          <span className="dot" />
          Add a target company on your profile to get company-matched recommendations
        </div>
      )}

      {recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          message="Complete a practice session to unlock weak-topic and company-matched recommendations."
        />
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Recommendations</h2>
            <span>{recommendations.length} recommendations</span>
          </div>
          <div className="mini-list">
            {recommendations.map(recommendation => (
              <div className="mini-item recommendation-item" key={recommendation.topic}>
                <div className="recommendation-main">
                  <strong>{recommendation.topic}</strong>
                  <span>{recommendation.reason}</span>
                </div>
                <div className="recommendation-meta">
                  {typeof recommendation.avgScore === 'number' && (
                    <div className="topic-score-wrap">
                      <div className="topic-bar">
                        <div
                          className="topic-bar-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, recommendation.avgScore))}%`,
                            background: getScoreColor(recommendation.avgScore)
                          }}
                        />
                      </div>
                      <strong style={{ color: getScoreColor(recommendation.avgScore) }}>
                        {recommendation.avgScore}
                      </strong>
                    </div>
                  )}
                  {typeof recommendation.companyQuestionCount === 'number' && (
                    <span className="recommendation-count">{recommendation.companyQuestionCount} company qs</span>
                  )}
                  <span className={`status-label priority-${recommendation.priority}`}>
                    {recommendation.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid two">
        <TopicPanel title="Weak topics" topics={weakTopics} tone="weak" />
        <CompanyTopicPanel topics={companyFocusTopics} targetCompany={data?.targetCompany} />
      </section>
    </section>
  );
}

function TopicPanel({ title, topics, tone }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`status-label ${tone}`}>Needs work</span>
      </div>
      <div className="mini-list">
        {topics.length === 0 ? (
          <div className="mini-item">
            <span>No scored topics yet</span>
          </div>
        ) : (
          topics.map(topic => (
            <div className="mini-item" key={topic.topic}>
              <span>{topic.topic}</span>
              <div className="topic-score-wrap">
                <div className="topic-bar">
                  <div
                    className="topic-bar-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, topic.avgScore))}%`,
                      background: getScoreColor(topic.avgScore)
                    }}
                  />
                </div>
                <strong style={{ color: getScoreColor(topic.avgScore) }}>{topic.avgScore}</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CompanyTopicPanel({ topics, targetCompany }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{targetCompany ? `${targetCompany} focus` : 'Company focus'}</h2>
        <span>{targetCompany || 'No company'}</span>
      </div>
      <div className="mini-list">
        {topics.length === 0 ? (
          <div className="mini-item">
            <span>No company-matched topics yet</span>
          </div>
        ) : (
          topics.map(topic => (
            <div className="mini-item" key={topic.topic}>
              <span>{topic.topic}</span>
              <strong className="recommendation-count">{topic.count} qs</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function getScoreColor(score) {
  if (score >= 70) return 'var(--teal)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/Status.jsx';
import Icon from '../components/Icon.jsx';

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
      <div className="page-head signature-card recommendations-hero">
        <div>
          <p className="eyebrow">Study plan</p>
          <h1>What to focus on next.</h1>
          <p className="lead">Built from your weak topics and patterns in PrepSense practice data.</p>
        </div>
        {data?.targetCompany && (
          <span className="chip selected recommendation-company">{data.targetCompany}</span>
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
        <section className="recommendation-section">
          <div className="section-heading">
            <h2>Recommendations</h2>
            <span>{recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}</span>
          </div>
          <div className="mini-list recommendations-list">
            {recommendations.map(recommendation => (
              <div className="mini-item recommendation-item" key={recommendation.topic}>
                <Icon name="target" className="recommendation-icon icon-tile" />
                <div className="recommendation-main">
                  <strong className="recommendation-topic">{recommendation.topic}</strong>
                  <span>{recommendation.reason}</span>
                </div>
                <span className={`chip priority-chip recommendation-priority priority-${recommendation.priority}`}>
                  {recommendation.priority}
                </span>
                <div className="topic-score-wrap recommendation-score">
                  {typeof recommendation.avgScore === 'number' ? (
                    <>
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
                    </>
                  ) : (
                    <strong className="recommendation-score-empty">-</strong>
                  )}
                </div>
                <div className="recommendation-action">
                  <Link className="button primary" to={`/interview/new?company=${encodeURIComponent(data?.targetCompany || '')}&category=${categoryForTopic(recommendation.topic)}`}>
                    Practice this
                  </Link>
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

function categoryForTopic(topic) {
  const normalized = String(topic || '').trim().toLowerCase();
  if (['arrays', 'strings', 'trees', 'graphs', 'dynamic programming'].includes(normalized)) return 'dsa';
  if (normalized === 'system design') return 'system_design';
  if (['os', 'dbms', 'networks'].includes(normalized)) return 'core';
  if (normalized === 'behavioral') return 'behavioral';
  return 'core';
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
            <span>No weak topics yet</span>
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
          <div className="mini-item company-focus-empty">
            <Icon name="target" className="icon-tile" />
            <span>No company-matched topics yet</span>
          </div>
        ) : (
          topics.map(topic => (
            <div className="mini-item" key={topic.topic}>
              <span>{topic.topic}</span>
              <strong className="recommendation-count">{topic.count} {topic.count === 1 ? 'question' : 'questions'}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

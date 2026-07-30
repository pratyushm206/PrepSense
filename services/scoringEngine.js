const { DIFFICULTIES } = require('../config/constants');

const DIFFICULTY_MULTIPLIERS = { easy: 0.8, medium: 1.0, hard: 1.3 };

function normalizeScore(rawScore, questionDifficulty) {
  const multiplier = DIFFICULTY_MULTIPLIERS[questionDifficulty] || 1.0;
  const scaled = rawScore * multiplier;
  return Math.min(100, Math.round(scaled));
}

function getLatestAnswersPerQuestion(answers) {
  const latestByQuestionId = new Map();
  for (const answer of answers) {
    latestByQuestionId.set(answer.questionId, answer);
  }
  return Array.from(latestByQuestionId.values());
}

function getTopicScores(sessions) {
  const topicTotals = new Map();

  sessions.forEach(session => {
    const latestAnswers = getLatestAnswersPerQuestion(session.answers || []);

    latestAnswers.forEach(answer => {
      const question = (session.questions || []).find(q => q.id === answer.questionId);
      if (!question) return;

      const normalized = normalizeScore(answer.score, question.difficulty);

      if (!topicTotals.has(question.topic)) {
        topicTotals.set(question.topic, { sum: 0, count: 0 });
      }
      const entry = topicTotals.get(question.topic);
      entry.sum += normalized;
      entry.count += 1;
    });
  });

  const result = Array.from(topicTotals.entries()).map(([topic, { sum, count }]) => ({
    topic,
    avgScore: Math.round(sum / count),
    totalAttempted: count
  }));

  return result.sort((a, b) => b.avgScore - a.avgScore);
}

// Flat average of this session's answers, normalized by question difficulty.
// This is "how the user did in this session" — answer-weighted, NOT topic-weighted.
// Topic-weighting belongs in getTopicScores/calculateReadiness, not here.
function calculateSessionScore(session) {
  const latestAnswers = getLatestAnswersPerQuestion(session.answers || []);
  if (latestAnswers.length === 0) return 0;

  const normalizedScores = latestAnswers.map(answer => {
    const question = (session.questions || []).find(q => q.id === answer.questionId);
    return question ? normalizeScore(answer.score, question.difficulty) : answer.score;
  });

  return Math.round(normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length);
}

function detectTrend(scoreHistory) {
  if (scoreHistory.length < 2) return 'stable';

  const mid = Math.floor(scoreHistory.length / 2);
  const firstHalf = scoreHistory.slice(0, mid);
  const secondHalf = scoreHistory.slice(mid);

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);

  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// Per-topic trend across sessions, using the same first-half-vs-second-half
// comparison as detectTrend, but on a chronological per-topic score history
// instead of a single flat session-score array.
//
// Sorts sessions by completedAt itself rather than trusting the caller to —
// this is a pure function that gets unit-tested directly, and correctness
// here should not depend on the DB query upstream remembering to sort.
//
// For each session, a topic's score is the average of that session's
// normalized answers on that topic (mirrors calculateSessionScore's
// per-session flattening, just scoped to one topic instead of the whole
// session). One data point per topic per session, in chronological order.
//
// Returns a topic -> trend map (not an array) so the controller can do an
// O(1) lookup per topic when merging into topicBreakdown, instead of
// .find()-ing through an array for every topic.
function getTopicTrends(sessions) {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.completedAt) - new Date(b.completedAt)
  );

  const topicHistories = new Map();

  sortedSessions.forEach(session => {
    const latestAnswers = getLatestAnswersPerQuestion(session.answers || []);
    const sessionTopicTotals = new Map();

    latestAnswers.forEach(answer => {
      const question = (session.questions || []).find(q => q.id === answer.questionId);
      if (!question) return;

      const normalized = normalizeScore(answer.score, question.difficulty);

      if (!sessionTopicTotals.has(question.topic)) {
        sessionTopicTotals.set(question.topic, { sum: 0, count: 0 });
      }
      const entry = sessionTopicTotals.get(question.topic);
      entry.sum += normalized;
      entry.count += 1;
    });

    sessionTopicTotals.forEach(({ sum, count }, topic) => {
      if (!topicHistories.has(topic)) topicHistories.set(topic, []);
      topicHistories.get(topic).push(Math.round(sum / count));
    });
  });

  const trends = {};
  topicHistories.forEach((history, topic) => {
    trends[topic] = detectTrend(history);
  });
  return trends;
}

function calculateReadiness(userSessions, targetCompany) {
  const scoredSessions = userSessions.filter(s => (s.answers || []).length > 0);
  if (scoredSessions.length === 0) return 0;

  const sessionAvgScores = scoredSessions.map(session => calculateSessionScore(session));

  const recentFive = sessionAvgScores.slice(-5);
  const recentWeight = recentFive.reduce((a, b) => a + b, 0) / recentFive.length;

  const topicScores = getTopicScores(scoredSessions);
  const breadthScore = Math.min(100, (topicScores.length / 10) * 100);

  const trend = detectTrend(sessionAvgScores);
  const trendBonus = trend === 'improving' ? 5 : trend === 'declining' ? -5 : 0;

  let companyMatchBonus = 0;
  if (targetCompany) {
    const companySessions = scoredSessions.filter(s => s.company === targetCompany);
    companyMatchBonus = companySessions.length > 0 ? 5 : 0;
  }

  const readiness = (recentWeight * 0.6) + (breadthScore * 0.25) + trendBonus + companyMatchBonus;
  return Math.max(0, Math.min(100, Math.round(readiness)));
}

module.exports = {
  normalizeScore,
  getTopicScores,
  detectTrend,
  getTopicTrends,
  calculateReadiness,
  calculateSessionScore
};
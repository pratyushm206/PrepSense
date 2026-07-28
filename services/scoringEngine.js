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

function calculateReadiness(userSessions, targetCompany) {
  const scoredSessions = userSessions.filter(s => (s.answers || []).length > 0);
  if (scoredSessions.length === 0) return 0;

  const sessionAvgScores = scoredSessions.map(session => {
    const latestAnswers = getLatestAnswersPerQuestion(session.answers);
    const normalizedScores = latestAnswers.map(answer => {
      const question = (session.questions || []).find(q => q.id === answer.questionId);
      return question ? normalizeScore(answer.score, question.difficulty) : answer.score;
    });
    return normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
  });

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

module.exports = { normalizeScore, getTopicScores, detectTrend, calculateReadiness };
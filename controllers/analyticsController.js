const Session = require('../models/Session');
const User = require('../models/User');
const { WEAK_TOPIC_SCORE_THRESHOLD } = require('../config/constants');
const {
  getTopicScores,
  calculateReadiness,
  getTopicTrends,
  hasLatestSuccessfulAnswer
} = require('../services/scoringEngine');

const getOverview = async (req, res, next) => {
  try {
    const [sessions, user] = await Promise.all([
      Session.find({ userId: req.user.userId })
        .select('company companyKey completedAt createdAt questions.id questions.topic questions.difficulty answers.questionId answers.score answers.evaluationStatus answers.isLatest')
        .lean(),
      User.findById(req.user.userId).select('targetCompanies').lean()
    ]);
    const scoredSessions = sessions.filter(hasLatestSuccessfulAnswer);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessionsThisWeek = scoredSessions.filter(session => {
      const sessionDate = session.completedAt || session.createdAt;
      return sessionDate && new Date(sessionDate).getTime() >= sevenDaysAgo;
    }).length;

    if (scoredSessions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          readinessScore: 0,
          evaluatedSessionCount: 0,
          sessionsThisWeek,
          topicBreakdown: [],
          weakAreas: [],
          strongAreas: []
        }
      });
    }

    const topicScores = getTopicScores(scoredSessions);
    const topicTrends = getTopicTrends(scoredSessions);
    const topicBreakdown = topicScores.map(t => ({
      ...t,
      trend: topicTrends[t.topic] || 'stable'
    }));

    const targetCompany = req.query.targetCompany || user?.targetCompanies?.[0];
    const readinessScore = calculateReadiness(scoredSessions, targetCompany);

    const weakAreas = [...topicBreakdown]
      .filter(topic => topic.avgScore < WEAK_TOPIC_SCORE_THRESHOLD)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3);
    const strongAreas = [...topicBreakdown]
      .filter(topic => topic.avgScore >= 75)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    res.status(200).json({
      success: true,
      data: {
        readinessScore,
        evaluatedSessionCount: scoredSessions.length,
        sessionsThisWeek,
        topicBreakdown,
        weakAreas,
        strongAreas
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview };

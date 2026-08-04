const Session = require('../models/Session');
const User = require('../models/User');
const { getTopicScores, calculateReadiness, getTopicTrends } = require('../services/scoringEngine');

const getOverview = async (req, res, next) => {
  try {
    const [sessions, user] = await Promise.all([
      Session.find({ userId: req.user.userId }),
      User.findById(req.user.userId).select('targetCompanies')
    ]);
    const scoredSessions = sessions.filter(s => (s.answers || []).length > 0);

    if (scoredSessions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { readinessScore: 0, topicBreakdown: [], weakAreas: [], strongAreas: [] }
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

    const weakAreas = [...topicBreakdown].sort((a, b) => a.avgScore - b.avgScore).slice(0, 3);
    const strongAreas = [...topicBreakdown].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);

    res.status(200).json({
      success: true,
      data: { readinessScore, topicBreakdown, weakAreas, strongAreas }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview };

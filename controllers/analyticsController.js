const Session = require('../models/Session');
const { getTopicScores, calculateReadiness } = require('../services/scoringEngine');

const getOverview = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId });
    const scoredSessions = sessions.filter(s => (s.answers || []).length > 0);

    if (scoredSessions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { readinessScore: 0, topicBreakdown: [], weakAreas: [], strongAreas: [] }
      });
    }

    const topicBreakdown = getTopicScores(scoredSessions);
    const readinessScore = calculateReadiness(scoredSessions);

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
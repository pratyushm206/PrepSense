const User = require('../models/User');
const Session = require('../models/Session');
const { calculateReadiness } = require('../services/scoringEngine');

const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalSessions, answeredSessions] = await Promise.all([
      User.countDocuments(),
      Session.countDocuments(),
      Session.find({ 'answers.0': { $exists: true } })
    ]);

    const companyCounts = new Map();
    const sessionsByUser = new Map();

    answeredSessions.forEach(session => {
      companyCounts.set(session.company, (companyCounts.get(session.company) || 0) + 1);

      const userKey = session.userId.toString();
      if (!sessionsByUser.has(userKey)) {
        sessionsByUser.set(userKey, []);
      }
      sessionsByUser.get(userKey).push(session);
    });

    const topCompaniesPracticed = Array.from(companyCounts.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const readinessScores = Array.from(sessionsByUser.values()).map(userSessions =>
      calculateReadiness(userSessions)
    );

    const avgReadinessScore = readinessScores.length === 0
      ? 0
      : Math.round(readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSessions,
        topCompaniesPracticed,
        avgReadinessScore
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };

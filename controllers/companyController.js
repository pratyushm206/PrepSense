const Session = require('../models/Session');

const getInsights = async (req, res, next) => {
  try {
    const { name } = req.params;

    const sessions = await Session.find({ company: name, 'answers.0': { $exists: true } });

    const topicCounts = new Map();
    let totalQuestions = 0;

    sessions.forEach(session => {
      session.questions.forEach(q => {
        topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
        totalQuestions += 1;
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: { company: name, totalSessionsAnalyzed: sessions.length, topTopics }
    });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { name } = req.params;

    const topSessions = await Session.find({ company: name, overallScore: { $gt: 0 } })
      .populate('userId', 'name')
      .sort({ overallScore: -1 })
      .limit(10);

    const leaderboard = topSessions.map(s => ({
      name: s.userId ? s.userId.name : 'Unknown',
      score: s.overallScore
    }));

    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInsights, getLeaderboard };
const Session = require('../models/Session');
const User = require('../models/User');
const { getTopicScores } = require('../services/scoringEngine');

function getTopCompanyTopics(sessions) {
  const topicCounts = new Map();

  sessions.forEach(session => {
    (session.questions || []).forEach(question => {
      topicCounts.set(question.topic, (topicCounts.get(question.topic) || 0) + 1);
    });
  });

  return Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('targetCompanies');
    const targetCompany = req.query.company || user?.targetCompanies?.[0] || null;

    const [userSessions, companySessions] = await Promise.all([
      Session.find({ userId: req.user.userId, 'answers.0': { $exists: true } }),
      targetCompany
        ? Session.find({ company: targetCompany, 'answers.0': { $exists: true } })
        : Promise.resolve([])
    ]);

    const weakTopics = getTopicScores(userSessions)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3);

    const companyFocusTopics = getTopCompanyTopics(companySessions);
    const companyTopicSet = new Set(companyFocusTopics.map(t => t.topic));
    const weakTopicSet = new Set(weakTopics.map(t => t.topic));

    const recommendationsByTopic = new Map();

    weakTopics.forEach(topicScore => {
      recommendationsByTopic.set(topicScore.topic, {
        topic: topicScore.topic,
        priority: companyTopicSet.has(topicScore.topic) ? 'high' : 'medium',
        reason: companyTopicSet.has(topicScore.topic)
          ? 'Weak personal topic and common company practice area'
          : 'Weak personal topic',
        avgScore: topicScore.avgScore
      });
    });

    companyFocusTopics.forEach(companyTopic => {
      if (recommendationsByTopic.has(companyTopic.topic)) return;

      recommendationsByTopic.set(companyTopic.topic, {
        topic: companyTopic.topic,
        priority: weakTopicSet.has(companyTopic.topic) ? 'high' : 'medium',
        reason: 'Common company practice area',
        companyQuestionCount: companyTopic.count
      });
    });

    const recommendations = Array.from(recommendationsByTopic.values())
      .sort((a, b) => {
        const priorityRank = { high: 0, medium: 1 };
        return priorityRank[a.priority] - priorityRank[b.priority];
      })
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        targetCompany,
        weakTopics,
        companyFocusTopics,
        recommendations
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRecommendations };

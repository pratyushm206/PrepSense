const Session = require('../models/Session');
const User = require('../models/User');
const { WEAK_TOPIC_SCORE_THRESHOLD } = require('../config/constants');
const { getTopicScores, hasLatestSuccessfulAnswer, normalizeTopic } = require('../services/scoringEngine');

function getTopCompanyTopics(sessions) {
  const topicCounts = new Map();

  const distinctTopics = new Set();

  sessions.forEach(session => {
    (session.questions || []).forEach(question => {
      const topic = normalizeTopic(question.topic);
      if (!topic) return;
      const normalizedQuestion = String(question.question || '').trim().toLowerCase();
      const key = `${session.company}:${topic}:${normalizedQuestion}`;
      if (distinctTopics.has(key)) return;
      distinctTopics.add(key);
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
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

    const [allUserSessions, allCompanySessions] = await Promise.all([
      Session.find({ userId: req.user.userId }),
      targetCompany
        ? Session.find({ company: targetCompany })
        : Promise.resolve([])
    ]);

    const userSessions = allUserSessions.filter(hasLatestSuccessfulAnswer);
    const companySessions = allCompanySessions.filter(hasLatestSuccessfulAnswer);

    const weakTopics = getTopicScores(userSessions)
      .filter(topicScore => topicScore.avgScore < WEAK_TOPIC_SCORE_THRESHOLD)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3);

    const companyFocusTopics = getTopCompanyTopics(companySessions);
    const companyTopicSet = new Set(companyFocusTopics.map(t => t.topic));

    const recommendations = weakTopics.map(topicScore => ({
        topic: topicScore.topic,
        priority: companyTopicSet.has(topicScore.topic) ? 'high' : 'medium',
        reason: companyTopicSet.has(topicScore.topic)
          ? 'Weak personal topic and common company practice area'
          : 'Weak personal topic',
        avgScore: topicScore.avgScore
      }))
      .sort((a, b) => {
        const priorityRank = { high: 0, medium: 1 };
        return priorityRank[a.priority] - priorityRank[b.priority] || a.avgScore - b.avgScore;
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

const Session = require('../models/Session');
const User = require('../models/User');
const { WEAK_TOPIC_SCORE_THRESHOLD } = require('../config/constants');
const { getTopicScores, hasLatestSuccessfulAnswer } = require('../services/scoringEngine');
const { companyMatch } = require('../services/normalization');

async function getTopCompanyTopics(company) {
  if (!company) return [];
  const result = await Session.aggregate([
    { $match: companyMatch(company) },
    { $addFields: {
      successfulLatestAnswers: {
        $filter: {
          input: { $ifNull: ['$answers', []] }, as: 'answer',
          cond: { $and: [
            { $ne: ['$$answer.isLatest', false] },
            { $eq: ['$$answer.evaluationStatus', 'success'] }
          ] }
        }
      }
    } },
    { $match: { $expr: { $gt: [{ $size: '$successfulLatestAnswers' }, 0] } } },
    { $unwind: '$questions' },
    { $project: {
      topic: { $toLower: { $trim: { input: '$questions.topic' } } },
      question: { $toLower: { $trim: { input: '$questions.question' } } }
    } },
    { $match: { topic: { $ne: '' }, question: { $ne: '' } } },
    { $group: { _id: { topic: '$topic', question: '$question' } } },
    { $group: { _id: '$_id.topic', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, topic: '$_id', count: 1 } }
  ]);
  return Array.isArray(result) ? result : [];
}

const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('targetCompanies').lean();
    const targetCompanies = Array.isArray(user?.targetCompanies) ? user.targetCompanies : [];
    const targetCompany = req.query.company || targetCompanies[0] || null;

    const [allUserSessions, allCompanySessions] = await Promise.all([
      Session.find({ userId: req.user.userId })
        .select('company companyKey completedAt questions.id questions.topic questions.difficulty answers.questionId answers.score answers.evaluationStatus answers.isLatest')
        .lean(),
      getTopCompanyTopics(targetCompany)
    ]);

    const userSessions = allUserSessions.filter(hasLatestSuccessfulAnswer);

    const weakTopics = getTopicScores(userSessions)
      .filter(topicScore => topicScore.avgScore < WEAK_TOPIC_SCORE_THRESHOLD)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3);

    const companyFocusTopics = Array.isArray(allCompanySessions) ? allCompanySessions : [];
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

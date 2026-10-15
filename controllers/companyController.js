const Session = require('../models/Session');
const { companyMatch } = require('../services/normalization');

const getInsights = async (req, res, next) => {
  try {
    const { name } = req.params;

    const [result] = await Session.aggregate([
      { $match: companyMatch(name) },
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
      { $facet: {
        sessions: [{ $count: 'count' }],
        topics: [
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
        ]
      } }
    ]);
    const topTopics = result?.topics || [];

    res.status(200).json({
      success: true,
      data: { company: name, totalSessionsAnalyzed: result?.sessions?.[0]?.count || 0, topTopics }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInsights };

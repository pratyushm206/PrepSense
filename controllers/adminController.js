const User = require('../models/User');
const Session = require('../models/Session');
const { calculateReadiness, hasLatestSuccessfulAnswer } = require('../services/scoringEngine');

const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalSessions, companyCounts, answeredSessions] = await Promise.all([
      User.countDocuments(),
      Session.countDocuments({ 'questions.0': { $exists: true } }),
      Session.aggregate([
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
        { $group: {
          _id: { $ifNull: ['$companyKey', { $toLower: { $trim: { input: '$company' } } }] },
          company: { $first: '$company' },
          count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, company: 1, count: 1 } }
      ]),
      Session.find({ answers: { $elemMatch: { isLatest: { $ne: false }, evaluationStatus: 'success' } } })
        .select('userId company companyKey completedAt questions.id questions.topic questions.difficulty answers.questionId answers.score answers.evaluationStatus answers.isLatest')
        .lean()
    ]);

    const evaluatedSessions = answeredSessions.filter(hasLatestSuccessfulAnswer);
    const sessionsByUser = new Map();

    evaluatedSessions.forEach(session => {
      const userKey = session.userId.toString();
      if (!sessionsByUser.has(userKey)) {
        sessionsByUser.set(userKey, []);
      }
      sessionsByUser.get(userKey).push(session);
    });

    const topCompaniesPracticed = companyCounts;

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

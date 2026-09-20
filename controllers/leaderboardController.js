const Session = require('../models/Session');

function maskName(name = '') {
  const [first = 'PrepSense', last = 'user'] = String(name).trim().split(/\s+/);
  const initial = last ? `${last.charAt(0).toUpperCase()}.` : '';
  return `${first} ${initial}`.trim();
}

const getLeaderboard = async (req, res, next) => {
  try {
    const company = req.params.company;
    if (!company) {
      return res.status(400).json({ success: false, message: 'company is required' });
    }

    const leaderboard = await Session.aggregate([
      {
        $match: {
          company,
          answers: {
            $elemMatch: {
              isLatest: { $ne: false },
              evaluationStatus: 'success'
            }
          },
          overallScore: { $ne: null, $gt: 0 }
        }
      },
      { $sort: { overallScore: -1, completedAt: -1 } },
      {
        $group: {
          _id: '$userId',
          score: { $max: '$overallScore' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.name',
          score: 1
        }
      }
    ]);

    const maskedLeaderboard = leaderboard.map(entry => ({
      score: entry.score,
      isCurrentUser: entry.userId.toString() === req.user.userId,
      username: entry.userId.toString() === req.user.userId
        ? 'You'
        : maskName(entry.username)
    }));

    res.status(200).json({ success: true, data: { company, leaderboard: maskedLeaderboard } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaderboard };

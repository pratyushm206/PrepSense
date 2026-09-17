const Session = require('../models/Session');

const getLeaderboard = async (req, res, next) => {
  try {
    const company = req.params.company;
    if (!company) {
      return res.status(400).json({ success: false, message: 'company is required' });
    }

    const leaderboard = await Session.aggregate([
      { $match: { company, overallScore: { $gt: 0 } } },
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
          username: '$user.name',
          score: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: { company, leaderboard } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaderboard };

const User = require('../models/User');

// Runs after protect — req.user.userId must already be set.
// Does a live DB lookup rather than trusting a JWT-embedded isAdmin flag,
// so revoking admin access takes effect on the next request instead of
// waiting out the token's 7-day expiry.
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = adminOnly;
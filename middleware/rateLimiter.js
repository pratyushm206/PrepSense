const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    return req.user && req.user.userId ? req.user.userId.toString() : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many AI requests. Please try again in a few minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = aiLimiter;
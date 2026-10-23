const rateLimit = require('express-rate-limit');
const Session = require('../models/Session');

function createUserLimiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator: req => req.user.userId.toString(),
    handler: (req, res) => res.status(429).json({
      success: false,
      message
    }),
    standardHeaders: true,
    legacyHeaders: false
  });
}

const generationLimiter = createUserLimiter(5, 'Question generation limit reached. Please try again in 15 minutes.');
const evaluationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: req => req.user.userId.toString(),
  skip: async req => {
    try {
      const session = await Session.findOne({ _id: req.body.sessionId, userId: req.user.userId })
        .select('questions')
        .lean();
      const question = session?.questions?.find(item => item.id === Number(req.body.questionId));
      return ['mcq', 'dsa-mcq'].includes(question?.type);
    } catch {
      return false;
    }
  },
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'AI is busy. Please try again in a minute.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const retryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: req => req.user.userId.toString(),
  skip: async req => {
    try {
      const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user.userId })
        .select('questions answers')
        .lean();
      const answer = session?.answers?.find(item => String(item._id) === req.params.answerId);
      const question = session?.questions?.find(item => item.id === answer?.questionId);
      return ['mcq', 'dsa-mcq'].includes(question?.type);
    } catch {
      return false;
    }
  },
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'AI is busy. Please try again in a minute.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  // College users often share one NAT IP, so successful auth should not consume the shared failure budget.
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Too many login or registration attempts. Please try again in 15 minutes.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many registration attempts. Please try again in an hour.' }),
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generationLimiter, evaluationLimiter, retryLimiter, authLimiter, registrationLimiter };

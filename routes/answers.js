const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { evaluate, retryEvaluation } = require('../controllers/answerController');
const aiLimiter = require('../middleware/rateLimiter');

router.post('/evaluate', protect, aiLimiter, evaluate);
router.post('/:sessionId/:answerId/retry', protect, aiLimiter, retryEvaluation);

module.exports = router;

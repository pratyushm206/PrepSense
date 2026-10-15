const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { evaluate, retryEvaluation } = require('../controllers/answerController');
const { evaluationLimiter, retryLimiter } = require('../middleware/rateLimiter');

router.post('/evaluate', protect, evaluationLimiter, evaluate);
router.post('/:sessionId/:answerId/retry', protect, retryLimiter, retryEvaluation);

module.exports = router;

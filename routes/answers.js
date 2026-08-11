const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { evaluate } = require('../controllers/answerController');

const aiLimiter = require('../middleware/rateLimiter');
router.post('/evaluate', protect, aiLimiter, evaluate);

module.exports = router;
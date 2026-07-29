const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { evaluate } = require('../controllers/answerController');

const rateLimit = require('express-rate-limit'); const aiLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
router.post('/evaluate', protect, evaluate);

module.exports = router;
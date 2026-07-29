const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generate } = require('../controllers/questionController');

const rateLimit = require('express-rate-limit'); const aiLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
router.post('/generate', protect, generate);

module.exports = router;
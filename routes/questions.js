const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generate } = require('../controllers/questionController');

const aiLimiter = require('../middleware/rateLimiter');
router.post('/generate', protect, aiLimiter, generate);

module.exports = router;
const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generate } = require('../controllers/questionController');

const { generationLimiter } = require('../middleware/rateLimiter');
router.post('/generate', protect, generationLimiter, generate);

module.exports = router;

const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { evaluate } = require('../controllers/answerController');

router.post('/evaluate', protect, evaluate);

module.exports = router;
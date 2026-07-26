const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generate } = require('../controllers/questionController');

router.post('/generate', protect, generate);

module.exports = router;
const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getStats } = require('../controllers/adminController');

router.get('/stats', protect, adminOnly, getStats);

module.exports = router;

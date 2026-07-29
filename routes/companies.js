const express = require('express');
const router = express.Router();
const { getInsights, getLeaderboard } = require('../controllers/companyController');

router.get('/:name/insights', getInsights);
router.get('/:name/leaderboard', getLeaderboard);

module.exports = router;
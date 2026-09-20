const express = require('express');
const router = express.Router();
const { getInsights } = require('../controllers/companyController');

router.get('/:name/insights', getInsights);

module.exports = router;

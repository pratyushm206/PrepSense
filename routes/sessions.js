const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');

router.post('/', protect, (req, res) => {
    res.json({ success: true, message: 'Sessions endpoint', user: req.user });
});

module.exports = router;
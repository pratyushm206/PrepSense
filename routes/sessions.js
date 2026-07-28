const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { createSession, getSessions, getSessionById } = require('../controllers/sessionController');

router.post('/', protect, createSession);
router.get('/', protect, getSessions);
router.get('/:id', protect, getSessionById);

module.exports = router;
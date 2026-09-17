const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  createSession,
  getSessions,
  getSessionById,
  shareSession
} = require('../controllers/sessionController');

router.post('/', protect, createSession);
router.get('/', protect, getSessions);
router.get('/:id', protect, getSessionById);
router.post('/:id/share', protect, shareSession);

module.exports = router;

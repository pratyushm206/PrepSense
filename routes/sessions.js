const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  createSession,
  getSessions,
  getSessionById,
  deleteEmptySession,
  deleteSession,
  deleteFailedSessions,
  shareSession,
  revokeShare
} = require('../controllers/sessionController');

router.post('/', protect, createSession);
router.get('/', protect, getSessions);
router.delete('/failed', protect, deleteFailedSessions);
router.delete('/:id/empty', protect, deleteEmptySession);
router.delete('/:id', protect, deleteSession);
router.get('/:id', protect, getSessionById);
router.post('/:id/share', protect, shareSession);
router.delete('/:id/share', protect, revokeShare);

module.exports = router;

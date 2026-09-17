const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  updatePassword,
  deactivateMe
} = require('../controllers/authController');
const protect = require('../middleware/auth');
const { body } = require('express-validator');

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginUser
);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.patch('/me', protect, updateMe);
router.put('/me/password', protect, updatePassword);
router.put('/me/deactivate', protect, deactivateMe);

module.exports = router;

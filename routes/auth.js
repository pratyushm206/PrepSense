const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  exportMyData,
  updatePassword,
  deactivateMe,
  deleteMe
} = require('../controllers/authController');
const protect = require('../middleware/auth');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');
const { validateTargetCompanies } = require('../controllers/authController');
const { body } = require('express-validator');

router.post(
  '/register',
  registrationLimiter,
  [
    body('email').trim().customSanitizer(value => String(value || '').toLowerCase()).isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('targetCompanies').optional().custom(validateTargetCompanies).withMessage('targetCompanies must be an array of up to 10 strings, each at most 60 characters')
  ],
  registerUser
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().customSanitizer(value => String(value || '').toLowerCase()).isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginUser
);

router.get('/me', protect, getMe);
router.get('/me/export', protect, exportMyData);
router.put('/me', protect, updateMe);
router.patch('/me', protect, updateMe);
router.put('/me/password', protect, updatePassword);
router.put('/me/deactivate', protect, deactivateMe);
router.post('/me/delete', authLimiter, protect, deleteMe);

module.exports = router;

// Express Router — a mini-app that handles a specific group of routes.
const express = require('express');
const router = express.Router();

// this is the routing layer — maps the URL
const { registerUser } = require('../controllers/authController');

router.post('/register', registerUser);


// Export
module.exports = router;
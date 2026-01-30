const express = require('express');
const router = express.Router();

const login = require('../controllers/auth/login');
const signup = require('../controllers/auth/signup');
const updatePassword = require('../controllers/auth/update-password');
const { authLimiter } = require('../middleware/rate-limit');
const requireAuth = require('../middleware/require-auth');

// RESTful routes
// POST /auth/signup - User registration
router.post('/signup', authLimiter, signup);

// POST /auth/login - User authentication
router.post('/login', authLimiter, login);

// POST /auth/update-password - Authenticated user password update
router.post('/update-password', requireAuth, updatePassword);

module.exports = router;

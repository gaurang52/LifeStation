const express = require('express');
const router = express.Router();

const login = require('../controllers/auth/login');
const signup = require('../controllers/auth/signup');
const updatePassword = require('../controllers/auth/update-password');
const getMe = require('../controllers/auth/get-me');
const getLifestationAccount = require('../controllers/auth/get-lifestation-account');
const updateProfile = require('../controllers/auth/update-profile');
const { authLimiter } = require('../middleware/rate-limit');
const requireAuth = require('../middleware/require-auth');

// RESTful routes
// POST /auth/signup - User registration
router.post('/signup', authLimiter, signup);

// POST /auth/login - User authentication
router.post('/login', authLimiter, login);

// Authenticated routes
// GET /auth/me - Current user (no password)
router.get('/me', requireAuth, getMe);

// GET /auth/lifestation-account - LifeStation Account API data for user's cs_no
router.get('/lifestation-account', requireAuth, getLifestationAccount);

// PATCH /auth/profile - Update name, mobile, notification_enabled
router.patch('/profile', requireAuth, updateProfile);

// POST /auth/update-password - Authenticated user password update
router.post('/update-password', requireAuth, updatePassword);

module.exports = router;

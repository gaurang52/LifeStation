const express = require('express');
const router = express.Router();

const login = require('../controllers/auth/login');
const signup = require('../controllers/auth/signup');
const { apiLimiter, authLimiter } = require('../middleware/rate-limit');

// RESTful routes
// POST /auth/signup - User registration
router.post('/signup', authLimiter, signup);

// POST /auth/login - User authentication
router.post('/login', authLimiter, login);

module.exports = router;

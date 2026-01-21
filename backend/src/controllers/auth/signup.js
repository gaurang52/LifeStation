require('dotenv').config();
const db = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const { isValidEmail, isValidUserType, isValidPhone } = require('../../utils/validators');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      user_type,
      mobile,
      address,
      gender,
      fcm_token,
      platform,
      privacy_accepted,
      terms_accepted,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({
        error: 'Name, email, password, and user_type are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate user type
    if (!isValidUserType(user_type)) {
      return res.status(400).json({
        error: 'Invalid user_type. Must be one of: ADMIN, SUPER_ADMIN, caregiver, senior',
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    // Validate mobile if provided
    if (mobile && !isValidPhone(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }

    // Check if privacy and terms are accepted (required for signup)
    if (privacy_accepted !== true || terms_accepted !== true) {
      return res.status(400).json({
        error: 'Privacy policy and terms of service must be accepted',
      });
    }

    // Check if user already exists
    const existingUser = await db.Users.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.Users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      user_type: user_type,
      mobile: mobile ? mobile.trim() : null,
      address: address ? address.trim() : null,
      gender: gender || null,
      fcm_token: fcm_token || null,
      platform: platform || null,
      privacy_accepted: privacy_accepted || false,
      terms_accepted: terms_accepted || false,
      status: 'ACTIVATED',
      is_login: true,
      extra_info: {
        isPro: false,
      },
    });

    // Generate JWT tokens
    const token = jwt.sign({ user_id: user.id, user_type: user.user_type }, JWT_SECRET_KEY, {
      expiresIn: '2 Days',
    });

    const refreshToken = jwt.sign(
      { user_id: user.id, user_type: user.user_type },
      REFRESH_SECRET_KEY,
      {
        expiresIn: '7 Days',
      },
    );

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      user_type: user.user_type,
      address: user.address,
      gender: user.gender,
      fcm_token: user.fcm_token,
      platform: user.platform,
      status: user.status,
      privacy_accepted: user.privacy_accepted,
      terms_accepted: user.terms_accepted,
      extra_info: user.extra_info,
      cs_no: user.cs_no,
      created_at: user.created_at,
    };

    logger.info(`User signed up: ${user.id} (${user.email}) - Type: ${user.user_type}`);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refresh_token: refreshToken,
      user: userData,
    });
  } catch (error) {
    logger.error('Error in signup:', error);

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'User with this email already exists',
      });
    }

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => e.message),
      });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = signup;

require('dotenv').config();
const db = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const { isValidEmail } = require('../../utils/validators');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const login = async (req, res) => {
  try {
    const { email, password, fcm_token, platform } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user
    const user = await db.Users.findOne({
      where: { email: email.toLowerCase(), status: 'ACTIVATED' },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is scheduled for deletion
    if (user.deletion_requested || user.status === 'DELETION_REQUESTED') {
      return res.status(401).json({
        error:
          'Account is scheduled for deletion. Please contact support if you did not request this.',
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update user login status
    await user.update({
      is_login: true,
      status: 'ACTIVATED',
      fcm_token: fcm_token || null,
      platform: platform || null,
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
      extra_info: user.extra_info,
      cs_no: user.cs_no,
      created_at: user.created_at,
    };

    logger.info(`User logged in: ${user.id} (${user.email})`);

    res.status(200).json({
      message: 'Login successful',
      token,
      refresh_token: refreshToken,
      user: userData,
    });
  } catch (error) {
    logger.error('Error in login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = login;

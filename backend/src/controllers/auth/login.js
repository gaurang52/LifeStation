require('dotenv').config();
const db = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const { isValidEmail } = require('../../utils/validators');
const externalApiTokenService = require('../../services/external-api-token.service');
const externalApiConfig = require('../../config/external-apis');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const login = async (req, res) => {
  try {
    const { email, password, fcm_token, platform } = req.body;

    // Log received FCM token for debugging (first 20 chars only for security)
    if (fcm_token) {
      logger.debug(
        `Login request received FCM token: ${fcm_token.substring(0, 20)}... (length: ${
          fcm_token.length
        })`,
      );
    } else {
      logger.debug('Login request received without FCM token');
    }

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

    // Update user login status and FCM token
    const updateData = {
      is_login: true,
      status: 'ACTIVATED',
      fcm_token: fcm_token || null,
      platform: platform || null,
    };

    await user.update(updateData);

    // Reload user to get updated values from database
    await user.reload();

    // Log FCM token update for debugging
    if (fcm_token) {
      logger.info(
        `FCM token updated for user ${user.id} (${user.email}): ${fcm_token.substring(0, 20)}...`,
      );
    } else {
      logger.debug(`No FCM token provided for user ${user.id} (${user.email})`);
    }

    // Normalize user_type to lowercase in JWT so all routes (requireRole, get-seniors, etc.) work consistently
    const normalizedUserType =
      user.user_type != null ? String(user.user_type).toLowerCase() : user.user_type;

    // Generate JWT tokens
    const token = jwt.sign({ user_id: user.id, user_type: normalizedUserType }, JWT_SECRET_KEY, {
      expiresIn: '2 Days',
    });

    const refreshToken = jwt.sign(
      { user_id: user.id, user_type: normalizedUserType },
      REFRESH_SECRET_KEY,
      {
        expiresIn: '7 Days',
      },
    );

    // Trigger external API authentication using service-level credentials from .env
    // This ensures external API tokens are available for subsequent API calls
    // Note: External system is treated as a token-based service dependency, not a user management system
    // We use EXTERNAL_API_USERNAME and EXTERNAL_API_PASSWORD from .env, NOT internal user credentials
    try {
      // Authenticate with Device API (brighton-api client)
      await externalApiTokenService.getToken('device', externalApiConfig.device.clientId);
      logger.debug('External Device API authentication successful on login');

      // Authenticate with Account API (affiliated-api client)
      await externalApiTokenService.getToken('account', externalApiConfig.account.clientId);
      logger.debug('External Account API authentication successful on login');
    } catch (externalAuthError) {
      // Log external authentication errors but don't fail the login
      // Internal login should succeed even if external API authentication fails
      logger.error('External API authentication failed on login (non-blocking):', {
        error: externalAuthError.message,
        user_id: user.id,
        email: user.email,
      });
      // Continue with login - external API failures should not block internal authentication
    }

    // Prepare user data (exclude password) - use reloaded user data
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

    logger.info(
      `User logged in: ${user.id} (${user.email}) - FCM token: ${
        user.fcm_token ? 'present' : 'not set'
      }`,
    );

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

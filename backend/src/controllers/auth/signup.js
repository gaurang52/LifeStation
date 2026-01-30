/**
 * Signup Controller
 *
 * ARCHITECTURE NOTE:
 * ==================
 * This controller creates users ONLY in our internal system.
 * NO external API calls are made to create or sync users.
 *
 * The external system is treated as an integration service (device/reports provider),
 * NOT a user management platform.
 */

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

    // Log received FCM token for debugging (first 20 chars only for security)
    if (fcm_token) {
      logger.debug(
        `Signup request received FCM token: ${fcm_token.substring(0, 20)}... (length: ${
          fcm_token.length
        })`,
      );
    } else {
      logger.debug('Signup request received without FCM token');
    }

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

    const normalizedEmail = email.toLowerCase().trim();
    let invitation = null;

    // For caregiver signup, check if invitation exists by email match
    if (user_type === 'caregiver') {
      // Find invitation by email (case-insensitive match)
      invitation = await db.CaregiverInvitations.findOne({
        where: {
          caregiver_email: normalizedEmail,
          status: 'PENDING',
        },
        include: [
          {
            model: db.Users,
            as: 'inviter',
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      if (!invitation) {
        return res.status(400).json({
          error: 'No invitation found',
          message:
            'No pending invitation found for this email address. Please contact the person who invited you.',
        });
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await invitation.update({ status: 'EXPIRED' });
        return res.status(400).json({
          error: 'Invitation expired',
          message:
            'This invitation has expired. Please contact the person who invited you for a new invitation.',
        });
      }

      // Check if invitation is revoked
      if (invitation.status === 'REVOKED') {
        return res.status(400).json({
          error: 'Invitation revoked',
          message: 'This invitation has been revoked. Please contact the person who invited you.',
        });
      }
    }

    // Check if user already exists
    const existingUser = await db.Users.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // If invitation exists, check if they're already mapped
      if (invitation) {
        const existingMapping = await db.SeniorCaregiverMapping.findOne({
          where: {
            senior_id: invitation.inviter_user_id,
            caregiver_id: existingUser.id,
          },
        });

        if (existingMapping) {
          return res.status(409).json({
            error: 'Already mapped',
            message: 'This caregiver is already added to the care circle',
          });
        }
        // User exists with valid invitation - they should log in instead
        // But we'll still create the mapping for them
        await invitation.update({
          status: 'ACCEPTED',
          accepted_at: new Date(),
        });

        await db.SeniorCaregiverMapping.create({
          senior_id: invitation.inviter_user_id,
          caregiver_id: existingUser.id,
          relationship_with_senior: invitation.relationship_with_senior,
        });

        logger.info(
          `Mapping created for existing user: Senior ${invitation.inviter_user_id} -> Caregiver ${existingUser.id}`,
        );

        return res.status(200).json({
          message: 'You already have an account. Please log in to continue.',
          error: 'User already exists',
          requires_login: true,
        });
      } else {
        return res.status(409).json({
          error: 'User with this email already exists',
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.Users.create({
      name: name.trim(),
      email: normalizedEmail,
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

    // Log FCM token for debugging
    if (fcm_token) {
      logger.info(
        `FCM token stored for new user ${user.id} (${user.email}): ${fcm_token.substring(
          0,
          20,
        )}...`,
      );
    } else {
      logger.debug(`No FCM token provided for new user ${user.id} (${user.email})`);
    }

    // Handle invitation acceptance and mapping creation (for caregiver signup)
    if (invitation && user_type === 'caregiver') {
      // Mark invitation as accepted
      await invitation.update({
        status: 'ACCEPTED',
        accepted_at: new Date(),
      });

      // Create caregiver-senior mapping automatically
      const mappingExists = await db.SeniorCaregiverMapping.findOne({
        where: {
          senior_id: invitation.inviter_user_id,
          caregiver_id: user.id,
        },
      });

      if (!mappingExists) {
        await db.SeniorCaregiverMapping.create({
          senior_id: invitation.inviter_user_id,
          caregiver_id: user.id,
          relationship_with_senior: invitation.relationship_with_senior,
        });
        logger.info(
          `Automatic mapping created: Senior ${invitation.inviter_user_id} -> Caregiver ${user.id}`,
        );
      } else {
        logger.warn(
          `Mapping already exists: Senior ${invitation.inviter_user_id} -> Caregiver ${user.id}`,
        );
      }
    }

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

    logger.info(
      `User signed up: ${user.id} (${user.email}) - Type: ${user.user_type} - FCM token: ${
        user.fcm_token ? 'present' : 'not set'
      }`,
    );

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

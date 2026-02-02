/**
 * Signup Controller
 *
 * ARCHITECTURE NOTE (OPTION A):
 * =============================
 * This controller implements Option A: Real-time validation with LifeStation APIs.
 * - If cs_no is provided, we validate it exists in LifeStation Account API before creating user
 * - Users are still stored in our internal system, but linked to LifeStation accounts via cs_no
 * - Device access will be validated via LifeStation Device API (not internal UserDeviceMapping)
 */

require('dotenv').config();
const db = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const { isValidEmail, isValidUserType, isValidPhone } = require('../../utils/validators');
const accountApiService = require('../../services/account-api.service');

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
      cs_no, // OPTION A: cs_no from LifeStation account
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

    // Normalize user_type (accept Caregiver/caregiver etc.) then validate
    const rawUserType = user_type;
    const user_type_normalized =
      typeof rawUserType === 'string'
        ? rawUserType === 'ADMIN' || rawUserType === 'SUPER_ADMIN'
          ? rawUserType
          : rawUserType.toLowerCase()
        : rawUserType;
    if (!isValidUserType(user_type_normalized)) {
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

    // OPTION A: Validate cs_no exists in LifeStation Account API (if provided)
    if (cs_no) {
      try {
        const accountData = await accountApiService.getAccount(cs_no);

        // Validate account is active
        if (accountData && accountData.status && accountData.status !== 'A') {
          return res.status(400).json({
            error: 'Invalid account',
            message: `LifeStation account ${cs_no} is not active (status: ${accountData.status}). Please contact support.`,
          });
        }

        logger.info(`Validated cs_no ${cs_no} against LifeStation Account API during signup`);
      } catch (accountError) {
        // If Account API returns 404, account doesn't exist
        if (accountError.response?.status === 404) {
          return res.status(400).json({
            error: 'Account not found',
            message: `LifeStation account ${cs_no} not found. Please verify your account number or contact support.`,
          });
        }

        // If Account API is down, reject signup (we need validation for Option A)
        logger.error(`Failed to validate cs_no ${cs_no} against LifeStation Account API:`, {
          error: accountError.message,
        });
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Unable to validate account with LifeStation. Please try again later.',
        });
      }
    } else {
      // OPTION A: For seniors, cs_no is required (they need LifeStation account)
      if (user_type_normalized === 'senior') {
        return res.status(400).json({
          error: 'cs_no required',
          message:
            'Senior accounts require a LifeStation account number (cs_no). Please provide your cs_no.',
        });
      }
      // Caregivers and admins can signup without cs_no initially
      logger.debug('Signup without cs_no (allowed for caregivers/admins)');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let invitation = null;

    // For caregiver signup, check if invitation exists by email match
    if (user_type_normalized === 'caregiver') {
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

    // Create user (store normalized user_type for consistent access control)
    // OPTION A: Store cs_no to link user to LifeStation account
    const user = await db.Users.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      user_type: user_type_normalized,
      mobile: mobile ? mobile.trim() : null,
      address: address ? address.trim() : null,
      gender: gender || null,
      fcm_token: fcm_token || null,
      platform: platform || null,
      privacy_accepted: privacy_accepted || false,
      terms_accepted: terms_accepted || false,
      status: 'ACTIVATED',
      is_login: true,
      cs_no: cs_no ? cs_no.trim() : null, // OPTION A: Link to LifeStation account
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
    if (invitation && user_type_normalized === 'caregiver') {
      // Resolve senior (inviter) ID - use FK column with fallback from included inviter
      const seniorId = invitation.inviter_user_id ?? invitation.inviter?.id;

      if (!seniorId) {
        logger.error('Caregiver signup: inviter_user_id missing on invitation', {
          invitation_id: invitation.id,
          caregiver_email: invitation.caregiver_email,
        });
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Invitation data is invalid. Please request a new invitation.',
        });
      }

      // Mark invitation as accepted
      await invitation.update({
        status: 'ACCEPTED',
        accepted_at: new Date(),
      });

      // Create caregiver-senior mapping automatically so caregiver can access senior data
      const mappingExists = await db.SeniorCaregiverMapping.findOne({
        where: {
          senior_id: seniorId,
          caregiver_id: user.id,
        },
      });

      if (!mappingExists) {
        await db.SeniorCaregiverMapping.create({
          senior_id: seniorId,
          caregiver_id: user.id,
          relationship_with_senior: invitation.relationship_with_senior || 'other',
        });
        logger.info(
          `Automatic mapping created: Senior ${seniorId} -> Caregiver ${user.id} (invitation ${invitation.id})`,
        );
      } else {
        logger.warn(`Mapping already exists: Senior ${seniorId} -> Caregiver ${user.id}`);
      }
    }

    // Normalize user_type to lowercase in JWT so all routes work consistently (same as login)
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

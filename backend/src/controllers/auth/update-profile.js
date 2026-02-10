const db = require('../../models');
const logger = require('../../utils/logger');
const { isValidDisplayName, isValidPhone } = require('../../utils/validators');

const NAME_MAX_LENGTH = 100;
const MOBILE_MAX_LENGTH = 15;

/**
 * Normalize phone: strip to digits and optional leading +
 */
function normalizePhone(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  if (!s) return null;
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * PATCH /auth/profile - Update current user profile (name, mobile, notification_enabled).
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, mobile, notification_enabled, timezone } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await db.Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name' });
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (trimmedName.length > NAME_MAX_LENGTH) {
        return res
          .status(400)
          .json({ error: `Name must be ${NAME_MAX_LENGTH} characters or less` });
      }
      const nameCheck = isValidDisplayName(name);
      if (!nameCheck.valid) {
        return res.status(400).json({ error: nameCheck.error });
      }
      updates.name = trimmedName;
    }

    if (mobile !== undefined) {
      const normalized = normalizePhone(mobile);
      if (normalized !== null) {
        if (normalized.length > MOBILE_MAX_LENGTH) {
          return res.status(400).json({
            error: `Phone number must be ${MOBILE_MAX_LENGTH} characters or less`,
          });
        }
        if (!isValidPhone(normalized)) {
          return res.status(400).json({ error: 'Invalid phone number format' });
        }
        updates.mobile = normalized;
      } else {
        updates.mobile = null;
      }
    }
    if (typeof notification_enabled === 'boolean') {
      updates.notification_enabled = notification_enabled;
    }
    if (timezone !== undefined) {
      const tz = typeof timezone === 'string' ? timezone.trim() : null;
      if (tz) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
        } catch {
          return res.status(400).json({ error: 'Invalid timezone' });
        }
        updates.extra_info = { ...(user.extra_info || {}), timezone: tz };
      } else {
        updates.extra_info = { ...(user.extra_info || {}) };
        delete updates.extra_info.timezone;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await user.update(updates);
    await user.reload();

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      user_type: user.user_type,
      notification_enabled: user.notification_enabled !== false,
    };

    logger.info(`Profile updated for user ${userId}`, { updates: Object.keys(updates) });

    return res.status(200).json({
      message: 'Profile updated',
      user: userData,
    });
  } catch (error) {
    logger.error('Error in update-profile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = updateProfile;

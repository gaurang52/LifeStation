const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * PATCH /auth/profile - Update current user profile (name, mobile, notification_enabled).
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, mobile, notification_enabled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await db.Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};
    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (mobile !== undefined) {
      updates.mobile = mobile === null || mobile === '' ? null : String(mobile).trim();
    }
    if (typeof notification_enabled === 'boolean') {
      updates.notification_enabled = notification_enabled;
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

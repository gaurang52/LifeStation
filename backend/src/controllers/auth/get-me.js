const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /auth/me - Return current authenticated user (no password).
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await db.Users.findByPk(userId, {
      attributes: [
        'id',
        'name',
        'email',
        'mobile',
        'user_type',
        'address',
        'gender',
        'status',
        'cs_no',
        'notification_enabled',
        'created_at',
      ],
    });

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      user_type: user.user_type,
      address: user.address,
      gender: user.gender,
      status: user.status,
      cs_no: user.cs_no,
      notification_enabled: user.notification_enabled !== false,
      created_at: user.created_at,
    };

    return res.status(200).json({ user: userData });
  } catch (error) {
    logger.error('Error in get-me:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = getMe;

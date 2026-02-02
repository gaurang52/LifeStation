const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /caregiver/seniors
 * Get all seniors mapped to the authenticated caregiver user
 */
const getSeniors = async (req, res) => {
  try {
    const userId = req.user_id;
    let userType = (req.user_type && String(req.user_type).toLowerCase()) || '';

    // Defensive: if verify-token left user_type empty, resolve from DB so caregivers don't get 403
    if (!userType && userId) {
      const user = await db.Users.findByPk(userId, { attributes: ['user_type'] });
      const raw = user?.user_type ?? user?.get?.('user_type') ?? user?.dataValues?.user_type;
      userType = raw != null && String(raw).trim() !== '' ? String(raw).toLowerCase() : '';
    }

    if (userType !== 'caregiver') {
      logger.warn('get-seniors: caller is not caregiver', {
        user_id: userId,
        user_type: req.user_type,
        resolved: userType,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only caregivers can view their seniors',
      });
    }

    // Get all senior mappings for this caregiver
    const mappings = await db.SeniorCaregiverMapping.findAll({
      where: { caregiver_id: userId },
      include: [
        {
          model: db.Users,
          as: 'senior',
          attributes: [
            'id',
            'name',
            'email',
            'mobile',
            'user_type',
            'address',
            'gender',
            'status',
            'extra_info',
            'created_at',
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Format response to match frontend expectations
    const seniors = mappings
      .map(mapping => {
        if (!mapping.senior) return null;
        return {
          id: mapping.senior.id,
          name: mapping.senior.name,
          email: mapping.senior.email,
          mobile: mapping.senior.mobile || '',
          user_type: mapping.senior.user_type,
          address: mapping.senior.address || '',
          gender: mapping.senior.gender || '',
          notification_enabled: true, // Default value
          extra_info: mapping.senior.extra_info || { isPro: false },
          status: mapping.senior.status || 'ACTIVATED',
          relationship_with_senior: mapping.relationship_with_senior,
        };
      })
      .filter(senior => senior !== null);

    res.status(200).json({
      data: seniors,
      message: 'Seniors retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in get-seniors:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getSeniors;

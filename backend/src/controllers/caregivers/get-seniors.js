const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /caregiver/seniors
 * Get all seniors mapped to the authenticated caregiver user
 */
const getSeniors = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;

    // Only caregivers can view their seniors
    if (userType !== 'caregiver') {
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

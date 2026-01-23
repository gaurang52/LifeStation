const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /senior/caregivers
 * Get all caregivers mapped to the authenticated senior user
 */
const getCaregivers = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;

    // Only seniors can view their caregivers
    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can view their caregivers',
      });
    }

    // Get all caregiver mappings for this senior
    const mappings = await db.SeniorCaregiverMapping.findAll({
      where: { senior_id: userId },
      include: [
        {
          model: db.Users,
          as: 'caregiver',
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
    const caregivers = mappings
      .map(mapping => {
        if (!mapping.caregiver) return null;
        return {
          id: mapping.caregiver.id,
          name: mapping.caregiver.name,
          email: mapping.caregiver.email,
          mobile: mapping.caregiver.mobile || '',
          user_type: mapping.caregiver.user_type,
          address: mapping.caregiver.address || '',
          gender: mapping.caregiver.gender || '',
          notification_enabled: true, // Default value
          extra_info: mapping.caregiver.extra_info || { isPro: false },
          status: mapping.caregiver.status || 'ACTIVATED',
          relationship_with_senior: mapping.relationship_with_senior,
        };
      })
      .filter(caregiver => caregiver !== null);

    res.status(200).json({
      data: caregivers,
      message: 'Caregivers retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in get-caregivers:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getCaregivers;

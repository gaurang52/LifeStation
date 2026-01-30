const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /senior/get-mapped-caregiver-list
 * Get all caregivers mapped to the authenticated senior + pending invitations (reference: umbrella get.mapped.caregiver.list.v2)
 */
const getCaregivers = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = (req.user_type && String(req.user_type).toLowerCase()) || '';

    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can view their caregivers',
      });
    }

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

    const caregiverList = mappings
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
          notification_enabled: true,
          extra_info: mapping.caregiver.extra_info || { isPro: false },
          status: mapping.caregiver.status || 'ACTIVATED',
          relationship_with_senior: mapping.relationship_with_senior,
          is_invited: false,
        };
      })
      .filter(Boolean);

    const pendingInvitations = await db.CaregiverInvitations.findAll({
      where: {
        inviter_user_id: userId,
        status: 'PENDING',
      },
      order: [['created_at', 'DESC']],
    });

    const invitedList = pendingInvitations.map(inv => ({
      invitation_id: inv.id,
      id: null,
      name: null,
      email: inv.caregiver_email,
      mobile: '',
      user_type: 'caregiver',
      status: 'INVITED',
      relationship_with_senior: inv.relationship_with_senior,
      is_invited: true,
      invitation_date: inv.created_at,
      expires_at: inv.expires_at,
    }));

    const data = [...caregiverList, ...invitedList];

    res.status(200).json({
      data,
      message: data.length
        ? 'Caregivers retrieved successfully'
        : 'No caregivers or pending invites',
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

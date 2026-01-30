const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /senior/caregivers/invitations
 * List all caregiver invitations for the authenticated senior
 */
const listInvitations = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = (req.user_type && String(req.user_type).toLowerCase()) || '';

    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can view their invitations',
      });
    }

    // Get all invitations for this senior
    const invitations = await db.CaregiverInvitations.findAll({
      where: { inviter_user_id: userId },
      order: [['created_at', 'DESC']],
    });

    // Check for expired invitations and update status
    const now = new Date();
    for (const invitation of invitations) {
      if (invitation.status === 'PENDING' && new Date(invitation.expires_at) < now) {
        await invitation.update({ status: 'EXPIRED' });
        invitation.status = 'EXPIRED';
      }
    }

    res.status(200).json({
      data: invitations.map(inv => ({
        id: inv.id,
        caregiver_email: inv.caregiver_email,
        status: inv.status,
        relationship_with_senior: inv.relationship_with_senior,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        accepted_at: inv.accepted_at,
        revoked_at: inv.revoked_at,
      })),
      message: 'Invitations retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in list-invitations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = listInvitations;

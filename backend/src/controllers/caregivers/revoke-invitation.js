const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * POST /senior/caregivers/invitations/:invitationId/revoke
 * Revoke a caregiver invitation
 */
const revokeInvitation = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;
    const { invitationId } = req.params;

    // Only seniors can revoke invitations
    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can revoke invitations',
      });
    }

    // Find invitation
    const invitation = await db.CaregiverInvitations.findOne({
      where: {
        id: invitationId,
        inviter_user_id: userId,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Invitation not found',
      });
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        error: 'Invalid operation',
        message:
          'Cannot revoke an accepted invitation. Remove the caregiver from your care circle instead.',
      });
    }

    // Check if already revoked
    if (invitation.status === 'REVOKED') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Invitation is already revoked',
      });
    }

    // Revoke invitation
    await invitation.update({
      status: 'REVOKED',
      revoked_at: new Date(),
    });

    logger.info(`Caregiver invitation revoked: ${invitation.id}`);

    res.status(200).json({
      message: 'Invitation revoked successfully',
      data: {
        id: invitation.id,
        caregiver_email: invitation.caregiver_email,
        status: invitation.status,
        revoked_at: invitation.revoked_at,
      },
    });
  } catch (error) {
    logger.error('Error in revoke-invitation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = revokeInvitation;

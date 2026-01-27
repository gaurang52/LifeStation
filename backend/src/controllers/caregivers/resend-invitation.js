const db = require('../../models');
const logger = require('../../utils/logger');
const emailService = require('../../services/email.service');

/**
 * POST /senior/caregivers/invitations/:invitationId/resend
 * Resend a caregiver invitation
 */
const resendInvitation = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;
    const { invitationId } = req.params;

    // Only seniors can resend invitations
    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can resend invitations',
      });
    }

    // Find invitation
    const invitation = await db.CaregiverInvitations.findOne({
      where: {
        id: invitationId,
        inviter_user_id: userId,
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
      return res.status(404).json({
        error: 'Not found',
        message: 'Invitation not found',
      });
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot resend an accepted invitation',
      });
    }

    // Check if invitation is revoked
    if (invitation.status === 'REVOKED') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot resend a revoked invitation. Please create a new invitation.',
      });
    }

    // Extend expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation
    await invitation.update({
      expires_at: expiresAt,
      status: 'PENDING', // Reset to pending if it was expired
    });

    // Send invitation email
    try {
      await emailService.sendCaregiverInvitation(
        invitation.caregiver_email,
        invitation.inviter.name,
      );
      logger.info(`Caregiver invitation resent: ${invitation.id}`);
    } catch (emailError) {
      logger.error(
        `Failed to resend invitation email for invitation ${invitation.id}:`,
        emailError,
      );
      return res.status(500).json({
        error: 'Email sending failed',
        message: 'Invitation was updated but email could not be sent. Please try again.',
      });
    }

    res.status(200).json({
      message: 'Invitation resent successfully',
      data: {
        id: invitation.id,
        caregiver_email: invitation.caregiver_email,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    logger.error('Error in resend-invitation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = resendInvitation;

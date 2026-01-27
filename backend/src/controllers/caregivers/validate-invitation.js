const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * GET /caregivers/invitations/validate/:token
 * Validate an invitation token (public endpoint, no auth required)
 */
const validateInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Invitation token is required',
      });
    }

    // Find invitation by token
    const invitation = await db.CaregiverInvitations.findOne({
      where: {
        invitation_token: token,
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
        message: 'Invalid invitation token',
      });
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        error: 'Invalid invitation',
        message: 'This invitation has already been accepted',
        data: {
          valid: false,
          status: invitation.status,
          accepted_at: invitation.accepted_at,
        },
      });
    }

    // Check if invitation is revoked
    if (invitation.status === 'REVOKED') {
      return res.status(400).json({
        error: 'Invalid invitation',
        message: 'This invitation has been revoked',
        data: {
          valid: false,
          status: invitation.status,
          revoked_at: invitation.revoked_at,
        },
      });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await invitation.update({ status: 'EXPIRED' });
      return res.status(400).json({
        error: 'Invalid invitation',
        message: 'This invitation has expired',
        data: {
          valid: false,
          status: 'EXPIRED',
          expires_at: invitation.expires_at,
        },
      });
    }

    // Check if user with this email already exists
    const existingUser = await db.Users.findOne({
      where: { email: invitation.caregiver_email },
    });

    if (existingUser) {
      // Check if they're already mapped
      const existingMapping = await db.SeniorCaregiverMapping.findOne({
        where: {
          senior_id: invitation.inviter_user_id,
          caregiver_id: existingUser.id,
        },
      });

      if (existingMapping) {
        return res.status(400).json({
          error: 'Invalid invitation',
          message: 'This caregiver is already added to the care circle',
          data: {
            valid: false,
            status: 'ALREADY_MAPPED',
          },
        });
      }
    }

    // Invitation is valid
    res.status(200).json({
      message: 'Invitation is valid',
      data: {
        valid: true,
        invitation_id: invitation.id,
        caregiver_email: invitation.caregiver_email,
        inviter_name: invitation.inviter.name,
        relationship_with_senior: invitation.relationship_with_senior,
        expires_at: invitation.expires_at,
        user_exists: !!existingUser,
      },
    });
  } catch (error) {
    logger.error('Error in validate-invitation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = validateInvitation;

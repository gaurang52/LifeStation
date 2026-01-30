const crypto = require('crypto');
const db = require('../../models');
const logger = require('../../utils/logger');
const { isValidEmail } = require('../../utils/validators');
const emailService = require('../../services/email.service');

/**
 * POST /senior/add-caregiver
 * Add a caregiver to the authenticated senior user by email
 * If caregiver exists: creates mapping directly
 * If caregiver doesn't exist: creates invitation
 * Body: { email: string, relationship_with_senior?: string }
 */
const addCaregiver = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = (req.user_type && String(req.user_type).toLowerCase()) || '';
    const { email, relationship_with_senior = 'other' } = req.body;

    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can add caregivers',
      });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Valid email is required',
      });
    }

    // Validate relationship type
    const validRelationships = [
      'parent',
      'sibling',
      'spouse',
      'child',
      'friend',
      'professional_caregiver',
      'other',
    ];
    if (!validRelationships.includes(relationship_with_senior)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: `relationship_with_senior must be one of: ${validRelationships.join(', ')}`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get inviter user details
    const inviterUser = await db.Users.findByPk(userId);
    if (!inviterUser) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
      });
    }

    // Prevent self-invitation
    if (inviterUser.email === normalizedEmail) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'You cannot add yourself as a caregiver',
      });
    }

    // Find the caregiver user by email
    const caregiverUser = await db.Users.findOne({
      where: { email: normalizedEmail, user_type: 'caregiver' },
    });

    // If caregiver exists, create mapping directly
    if (caregiverUser) {
      // Check if caregiver is already mapped
      const existingMapping = await db.SeniorCaregiverMapping.findOne({
        where: {
          senior_id: userId,
          caregiver_id: caregiverUser.id,
        },
      });

      if (existingMapping) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This caregiver is already added to your care circle',
        });
      }

      // Prevent self-mapping
      if (userId === caregiverUser.id) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'You cannot add yourself as a caregiver',
        });
      }

      // Create the mapping
      const mapping = await db.SeniorCaregiverMapping.create({
        senior_id: userId,
        caregiver_id: caregiverUser.id,
        relationship_with_senior,
      });

      logger.info(`Caregiver ${caregiverUser.id} added to senior ${userId}`);

      return res.status(201).json({
        message: 'Caregiver added successfully',
        data: {
          id: mapping.id,
          caregiver_id: caregiverUser.id,
          caregiver: {
            id: caregiverUser.id,
            name: caregiverUser.name,
            email: caregiverUser.email,
            mobile: caregiverUser.mobile,
          },
          relationship_with_senior: mapping.relationship_with_senior,
        },
      });
    }

    // Caregiver doesn't exist - create invitation
    // Check for existing pending invitation
    const existingInvitation = await db.CaregiverInvitations.findOne({
      where: {
        inviter_user_id: userId,
        caregiver_email: normalizedEmail,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      // Check if invitation is expired
      if (new Date(existingInvitation.expires_at) < new Date()) {
        // Mark as expired and create new one
        await existingInvitation.update({ status: 'EXPIRED' });
      } else {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An invitation has already been sent to this email address',
          data: {
            invitation_id: existingInvitation.id,
            expires_at: existingInvitation.expires_at,
            status: 'PENDING',
          },
        });
      }
    }

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Generate a unique invitation token
    let invitationToken;
    let isUnique = false;
    while (!isUnique) {
      invitationToken = crypto.randomBytes(32).toString('hex');
      const existingToken = await db.CaregiverInvitations.findOne({
        where: { invitation_token: invitationToken },
      });
      if (!existingToken) {
        isUnique = true;
      }
    }

    // Create invitation
    const invitation = await db.CaregiverInvitations.create({
      inviter_user_id: userId,
      caregiver_email: normalizedEmail,
      invitation_token: invitationToken,
      status: 'PENDING',
      relationship_with_senior,
      expires_at: expiresAt,
    });

    // Send invitation email
    try {
      await emailService.sendCaregiverInvitation(normalizedEmail, inviterUser.name);
      logger.info(`Caregiver invitation created and email sent: ${invitation.id}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email for invitation ${invitation.id}:`, emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      data: {
        invitation_id: invitation.id,
        caregiver_email: invitation.caregiver_email,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
    });
  } catch (error) {
    logger.error('Error in add-caregiver:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = addCaregiver;

const db = require('../../models');
const logger = require('../../utils/logger');
const { isValidEmail } = require('../../utils/validators');

/**
 * POST /senior/caregivers
 * Add a caregiver to the authenticated senior user by email
 * Body: { email: string, relationship_with_senior?: string }
 */
const addCaregiver = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = req.user_type;
    const { email, relationship_with_senior = 'other' } = req.body;

    // Only seniors can add caregivers
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

    // Find the caregiver user by email
    const caregiverUser = await db.Users.findOne({
      where: { email: email.toLowerCase(), user_type: 'caregiver' },
    });

    if (!caregiverUser) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No caregiver account found with this email',
      });
    }

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

    res.status(201).json({
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
  } catch (error) {
    logger.error('Error in add-caregiver:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = addCaregiver;

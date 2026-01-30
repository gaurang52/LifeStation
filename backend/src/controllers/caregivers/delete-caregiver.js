const db = require('../../models');
const logger = require('../../utils/logger');

/**
 * POST /senior/delete-caregiver
 * Remove a caregiver from the authenticated senior user's care circle
 * Body: { caregiver_id: number }
 */
const deleteCaregiver = async (req, res) => {
  try {
    const userId = req.user_id;
    const userType = (req.user_type && String(req.user_type).toLowerCase()) || '';
    const { caregiver_id } = req.body;

    if (userType !== 'senior') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only seniors can remove caregivers',
      });
    }

    // Validate caregiver_id
    const caregiverIdNum = parseInt(caregiver_id);
    if (isNaN(caregiverIdNum)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Invalid caregiver_id',
      });
    }

    // Find and delete the mapping
    const mapping = await db.SeniorCaregiverMapping.findOne({
      where: {
        senior_id: userId,
        caregiver_id: caregiverIdNum,
      },
    });

    if (!mapping) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Caregiver not found in your care circle',
      });
    }

    await mapping.destroy();

    logger.info(`Caregiver ${caregiverIdNum} removed from senior ${userId}`);

    res.status(200).json({
      message: 'Caregiver removed successfully',
    });
  } catch (error) {
    logger.error('Error in delete-caregiver:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = deleteCaregiver;

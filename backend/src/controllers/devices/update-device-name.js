const db = require('../../models');
const accessControlService = require('../../services/access-control.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');

/**
 * Update the user-friendly device name (stored in UserDeviceMapping.device_name).
 * Only the user who owns the device mapping (e.g. senior who registered the device) can set the name.
 * The external LifeStation Device API does not provide an endpoint to set device name.
 */
const updateDeviceName = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const { name } = req.body;
    const userId = req.user_id;

    if (!isValidIdType(id_type)) {
      return res
        .status(400)
        .json({ error: 'Invalid id_type. Must be: imei, serial, uuid, or iccid' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (trimmedName.length > 255) {
      return res.status(400).json({ error: 'Device name must be 255 characters or less' });
    }

    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type, {
      userType: req.user_type,
    });

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    const mapping = await db.UserDeviceMapping.findOne({
      where: {
        user_id: userId,
        external_device_id: id,
        id_type,
      },
    });

    if (!mapping) {
      return res.status(404).json({
        error: 'Device mapping not found',
        message:
          'Only the account that registered this device can set its name. Caregivers can view but not rename devices.',
      });
    }

    await mapping.update({
      device_name: trimmedName || null,
      updated_at: new Date(),
    });

    logger.info('Device name updated', {
      user_id: userId,
      device_id: id,
      id_type,
      name_set: !!trimmedName,
    });

    res.status(200).json({
      message: trimmedName ? 'Device name updated' : 'Device name cleared',
      device: {
        device_id: id,
        id_type,
        name: trimmedName || null,
      },
    });
  } catch (error) {
    logger.error('Error in update-device-name:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = updateDeviceName;

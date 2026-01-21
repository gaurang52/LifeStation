const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const db = require('../../models');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');

const toggleFallDetection = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const { enabled } = req.body;
    const userId = req.user_id;

    if (!id || !id_type) {
      return res.status(400).json({
        error: 'Device ID and id_type are required',
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'enabled (boolean) is required in request body',
      });
    }

    if (!isValidIdType(id_type)) {
      return res.status(400).json({ error: 'Invalid id_type. Must be: imei, serial, or uuid' });
    }

    // Check access control
    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type);

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    // Toggle fall detection via Device API
    try {
      let result;
      if (enabled) {
        result = await deviceApiService.turnOnFallDetection(id_type, id);
      } else {
        result = await deviceApiService.turnOffFallDetection(id_type, id);
      }

      // Update local database
      await db.Devices.update(
        { fall_detection_enabled: enabled },
        {
          where: {
            device_id: id,
            id_type: id_type,
          },
        },
      );

      // Log audit entry
      await auditLogService.log({
        user_id: userId,
        action: 'fall_detection_toggled',
        resource_type: 'device',
        resource_id: id,
        external_api: 'device',
        request_method: 'PUT',
        request_path: `/devices/${id_type}/${id}/fall-detection`,
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      logger.info(
        `Fall detection ${enabled ? 'enabled' : 'disabled'} for device ${id} by user ${userId}`,
      );

      res.status(200).json({
        message: `Fall detection ${enabled ? 'enabled' : 'disabled'} successfully`,
        device_id: id,
        id_type,
        fall_detection_enabled: enabled,
      });
    } catch (error) {
      logger.error('Error toggling fall detection via Device API:', error);
      res.status(500).json({
        error: 'Failed to toggle fall detection on external service',
        message: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in toggle-fall-detection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = toggleFallDetection;

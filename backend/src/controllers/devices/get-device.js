const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');

const getDevice = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const userId = req.user_id;

    // Validate id_type
    if (!isValidIdType(id_type)) {
      return res.status(400).json({ error: 'Invalid id_type. Must be: imei, serial, or uuid' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Check access control
    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type);

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    try {
      const device = await deviceApiService.getDevice(id_type, id);
      const normalized = dataNormalizationService.normalizeDevice(device);

      // Log audit entry
      await auditLogService.log({
        user_id: userId,
        action: 'device_access',
        resource_type: 'device',
        resource_id: id,
        external_api: 'device',
        request_method: 'GET',
        request_path: `/devices/${id_type}/${id}`,
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(200).json({
        device: normalized,
      });
    } catch (error) {
      logger.error('Error fetching device from Device API:', error);
      res.status(500).json({
        error: 'Failed to fetch device from external service',
        message: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in get-device:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getDevice;

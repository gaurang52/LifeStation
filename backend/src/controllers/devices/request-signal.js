const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const requestSignal = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const userId = req.user_id;

    if (!id || !id_type) {
      return res.status(400).json({
        error: 'Device ID and id_type are required',
      });
    }

    if (!isValidIdType(id_type)) {
      return res
        .status(400)
        .json({ error: 'Invalid id_type. Must be: imei, serial, uuid, or iccid' });
    }

    // Check access control; pass userType to avoid duplicate user fetch
    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type, {
      userType: req.user_type,
    });

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    // Request signal via Device API
    try {
      const result = await deviceApiService.requestDeviceSignal(id_type, id);

      // Log audit entry
      await auditLogService.log({
        user_id: userId,
        action: 'signal_requested',
        resource_type: 'device',
        resource_id: id,
        external_api: 'device',
        request_method: 'POST',
        request_path: `/device/${id_type}/${id}/signal`,
        request_body: { id_type, id },
        response_body: sanitizeResponseBody(result),
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      logger.info(`Signal requested for device ${id} by user ${userId}`);

      res.status(200).json({
        message: 'Signal request sent successfully',
        device_id: id,
        id_type,
        result: result || { status: 'requested' },
      });
    } catch (error) {
      logger.error('Error requesting signal via Device API:', error);
      res.status(500).json({
        error: 'Failed to request signal from external service',
        message: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in request-signal:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = requestSignal;

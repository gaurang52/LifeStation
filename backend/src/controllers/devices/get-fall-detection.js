const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getFallDetection = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const userId = req.user_id;

    if (!id || !id_type) {
      return res.status(400).json({
        status: 'error',
        errors: ['Device ID and id_type are required'],
      });
    }

    if (!isValidIdType(id_type)) {
      return res.status(400).json({
        status: 'error',
        errors: ['Invalid id_type. Must be: imei, serial, uuid, or iccid'],
      });
    }

    // Check access control
    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type);

    if (!canAccess) {
      return res.status(403).json({
        status: 'error',
        errors: ['Access denied: You do not have permission to access this device'],
      });
    }

    // Get fall detection status from Device API
    try {
      const fallDetection = await deviceApiService.getFallDetection(id_type, id);

      // Log audit entry
      await auditLogService.log({
        user_id: userId,
        action: 'fall_detection_access',
        resource_type: 'device',
        resource_id: id,
        external_api: 'device',
        request_method: 'GET',
        request_path: `/device/${id_type}/${id}/falldetection`,
        request_body: { id_type, id },
        response_body: sanitizeResponseBody(fallDetection),
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      // Match API documentation format exactly
      // Response: { "status": "ok", "errors": [], "fall_detection_status": [status] }
      // Status can be: 'active', 'inactive', or 'pending'
      const fallDetectionStatus =
        fallDetection.fall_detection_status || fallDetection.status || 'inactive';

      res.status(200).json({
        status: 'ok',
        errors: [],
        fall_detection_status: fallDetectionStatus,
      });
    } catch (error) {
      logger.error('Error fetching fall detection from Device API:', error);
      res.status(500).json({
        status: 'error',
        errors: ['Failed to fetch fall detection status from external service'],
      });
    }
  } catch (error) {
    logger.error('Error in get-fall-detection:', error);
    res.status(500).json({
      status: 'error',
      errors: ['Internal server error'],
    });
  }
};

module.exports = getFallDetection;

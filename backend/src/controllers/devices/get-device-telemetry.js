const deviceApiService = require('../../services/device-api.service');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const db = require('../../models');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getDeviceTelemetry = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const userId = req.user_id;

    if (!id || !id_type) {
      return res.status(400).json({ error: 'Device ID and id_type are required' });
    }

    if (!isValidIdType(id_type)) {
      return res
        .status(400)
        .json({ error: 'Invalid id_type. Must be: imei, serial, uuid, or iccid' });
    }

    const canAccess = await accessControlService.canUserAccessDevice(userId, id, id_type, {
      userType: req.user_type,
    });
    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    try {
      const deviceRecent = await deviceApiService.getDeviceRecent(id_type, id);
      const normalized = dataNormalizationService.normalizeDevice(deviceRecent);

      const telemetry = {
        battery_level: normalized.battery_level ?? null,
        signal_strength: normalized.signal_strength ?? null,
        location: normalized.location ?? null,
        last_seen: normalized.last_seen ?? null,
        fall_detection_enabled: normalized.fall_detection_enabled ?? false,
      };

      await db.Devices.update(
        {
          battery_level: telemetry.battery_level,
          signal_strength: telemetry.signal_strength,
          last_seen: telemetry.last_seen || new Date(),
          fall_detection_enabled: telemetry.fall_detection_enabled,
          last_synced_at: new Date(),
          device_metadata: normalized.metadata || {},
        },
        {
          where: {
            device_id: id,
            id_type: id_type,
          },
        },
      );

      await auditLogService.log({
        user_id: userId,
        action: 'device_telemetry_access',
        resource_type: 'device',
        resource_id: id,
        external_api: 'device',
        request_method: 'GET',
        request_path: `/device/${id_type}/${id}/recent`,
        request_body: { id_type, id },
        response_body: sanitizeResponseBody(deviceRecent),
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(200).json({
        device_id: id,
        id_type,
        telemetry,
      });
    } catch (error) {
      logger.error('Error fetching telemetry from Device API:', {
        error: error.message,
        id_type,
        id,
        user_id: userId,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      res.status(500).json({
        error: 'Unable to fetch device telemetry',
        message: isExternalError
          ? 'The device service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching device telemetry. Please try again later.',
      });
    }
  } catch (error) {
    logger.error('Error in get-device-telemetry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getDeviceTelemetry;

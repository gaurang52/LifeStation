const deviceApiService = require('../../services/device-api.service');
const db = require('../../models');
const accessControlService = require('../../services/access-control.service');
const auditLogService = require('../../services/audit-log.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const logger = require('../../utils/logger');
const { isValidIdType, isValidIMEI } = require('../../utils/validators');
const { sanitizeResponseBody, sanitizeRequestBody } = require('../../utils/audit-sanitizer');

const addDevice = async (req, res) => {
  try {
    const { device_imei, sim_iccid, device_type, sim_action = 'none', name: deviceName } = req.body;
    const userId = req.user_id;

    // Validate input
    if (!device_imei) {
      return res.status(400).json({ error: 'device_imei is required' });
    }

    if (!isValidIMEI(device_imei)) {
      return res.status(400).json({ error: 'Invalid IMEI format' });
    }

    // Validate user is a senior
    const user = await db.Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'senior') {
      return res.status(403).json({ error: 'Only seniors can register devices' });
    }

    // Check if device already exists locally
    let device = await db.Devices.findOne({
      where: {
        device_id: device_imei,
        id_type: 'imei',
      },
    });

    if (device) {
      // Device exists, check if already mapped to user
      const existingMapping = await db.UserDeviceMapping.findOne({
        where: {
          user_id: userId,
          device_id: device.id,
        },
      });

      if (existingMapping) {
        return res.status(200).json({
          message: 'Device already registered and mapped to user',
          device: {
            device_id: device_imei,
            id_type: 'imei',
            status: device.status,
            name: device.name,
          },
        });
      }
    }

    // Register device with Device API
    // Build request body matching Postman collection exactly (omit null/undefined values)
    const deviceData = {
      device_imei,
      sim_action,
    };

    // Only include optional fields if they have values (matching Postman collection structure)
    if (sim_iccid) {
      deviceData.sim_iccid = sim_iccid;
    }
    if (device_type !== null && device_type !== undefined) {
      deviceData.device_type = device_type;
    }

    // Register device with external Device API using service-level credentials
    // Note: External system is an integration service (device provider), not a user management platform
    // This call uses service credentials from .env, not user-specific authentication
    let externalDevice;
    try {
      externalDevice = await deviceApiService.addDevice(deviceData);
    } catch (error) {
      logger.error('Error adding device via Device API:', {
        error: error.message,
        device_imei: device_imei,
        user_id: userId,
      });

      // Differentiate between external service errors and internal errors
      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to register device',
        message: isExternalError
          ? 'The device service is currently unavailable. Please try again later.'
          : 'An error occurred while registering the device. Please try again later.',
      });
    }

    // Normalize status value from external API
    const validStatuses = ['active', 'inactive', 'pending', 'deactivated', 'error'];
    const normalizedStatus =
      externalDevice.status && validStatuses.includes(externalDevice.status.toLowerCase())
        ? externalDevice.status.toLowerCase()
        : 'active';

    // Store device locally
    if (!device) {
      device = await db.Devices.create({
        device_id: device_imei,
        id_type: 'imei',
        device_imei,
        device_serial: externalDevice.serial || null,
        device_uuid: externalDevice.uuid || null,
        name: externalDevice.name || null,
        sim_iccid: sim_iccid || null,
        device_type: device_type || null,
        servco_no: user.servco_no || null,
        status: normalizedStatus,
        battery_level: externalDevice.battery_level || null,
        signal_strength: externalDevice.signal_strength || null,
        last_seen: externalDevice.last_seen || new Date(),
        device_metadata: externalDevice.metadata || {},
        last_synced_at: new Date(),
      });
    } else {
      // Update existing device with normalized status
      const updateStatus =
        externalDevice.status && validStatuses.includes(externalDevice.status.toLowerCase())
          ? externalDevice.status.toLowerCase()
          : device.status;

      await device.update({
        device_serial: externalDevice.serial || device.device_serial,
        device_uuid: externalDevice.uuid || device.device_uuid,
        name: externalDevice.name || device.name,
        sim_iccid: sim_iccid || device.sim_iccid,
        device_type: device_type || device.device_type,
        status: updateStatus,
        battery_level: externalDevice.battery_level || device.battery_level,
        signal_strength: externalDevice.signal_strength || device.signal_strength,
        last_seen: externalDevice.last_seen || device.last_seen,
        device_metadata: externalDevice.metadata || device.device_metadata,
        last_synced_at: new Date(),
      });
    }

    // UserDeviceMapping.cs_no must be derived from the users table (cs_no provided at sign-up),
    // not from the request payload or the Device API response.
    const currentUserCsNo = user.cs_no ? String(user.cs_no).trim() : '';
    const csNoFromApi = externalDevice.cs_no || externalDevice.csNo || null;

    // Backfill User.cs_no only if senior has none (e.g. legacy account) so we can derive mapping from users table
    if (!currentUserCsNo && csNoFromApi) {
      const trimmedApiCsNo = String(csNoFromApi).trim();
      await db.Users.update({ cs_no: trimmedApiCsNo }, { where: { id: userId } });
      user.cs_no = trimmedApiCsNo;
      logger.info(
        `Backfilled User.cs_no for senior ${userId} from device add (cs_no: ${trimmedApiCsNo.slice(
          0,
          12,
        )}...)`,
      );
    }

    // Use authenticated user's cs_no from users table for the mapping (never from request or API)
    const mappingCsNo = user.cs_no ? String(user.cs_no).trim() : null;

    // Optional user-friendly name (max 255 chars); external Device API does not accept name on Add Device
    const trimmedDeviceName =
      typeof deviceName === 'string' && deviceName.trim().length > 0
        ? deviceName.trim().slice(0, 255)
        : null;

    // Create user-device mapping (cs_no from users table only)
    await db.UserDeviceMapping.create({
      user_id: userId,
      device_id: device.id,
      external_device_id: device_imei,
      id_type: 'imei',
      cs_no: mappingCsNo,
      device_name: trimmedDeviceName,
    });

    // Log audit entry
    await auditLogService.log({
      user_id: userId,
      action: 'device_registered',
      resource_type: 'device',
      resource_id: device_imei,
      external_api: 'device',
      request_method: 'PUT',
      request_path: '/device/',
      request_body: sanitizeRequestBody(deviceData),
      response_body: sanitizeResponseBody(externalDevice),
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    logger.info(`Device registered: ${device_imei} for user ${userId}`);

    const displayName = trimmedDeviceName || device.name || externalDevice.name || null;

    res.status(200).json({
      message: 'Device registered successfully',
      device: {
        id: device.id,
        device_id: device_imei,
        id_type: 'imei',
        name: displayName,
        status: device.status,
        battery_level: device.battery_level,
        signal_strength: device.signal_strength,
      },
    });
  } catch (error) {
    logger.error('Error in add-device:', error);

    // Differentiate internal errors from external API errors
    if (error.response) {
      // External API error
      return res.status(500).json({
        error: 'Unable to register device',
        message: 'The device service encountered an error. Please try again later.',
      });
    }

    // Internal error
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = addDevice;

const deviceApiService = require('../../services/device-api.service');
const accountApiService = require('../../services/account-api.service');
const db = require('../../models');
const { Op } = require('sequelize');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getDevices = async (req, res) => {
  try {
    const userId = req.user_id;
    const { page = 1, limit = 10 } = req.query;

    // Get all accessible devices for user (from internal mapping); pass userType to avoid duplicate user fetch
    const accessibleDevices = await accessControlService.getAccessibleDevicesForUser(userId, {
      userType: req.user_type,
    });

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        devices: [],
        message: 'No devices found',
      });
    }

    // Fetch user-set device names (UserDeviceMapping.device_name) for display
    const mappingList = await db.UserDeviceMapping.findAll({
      where: {
        [Op.or]: accessibleDevices.map(d => ({
          external_device_id: d.device_id,
          id_type: d.id_type,
        })),
      },
      attributes: ['external_device_id', 'id_type', 'device_name'],
    });
    const customNameByDevice = new Map(
      mappingList
        .filter(m => m.device_name && m.device_name.trim() !== '')
        .map(m => [`${m.external_device_id}|${m.id_type}`, m.device_name]),
    );

    // Fetch device details from external Device API using service-level credentials
    // Note: External system is an integration service (device provider), not a user management platform
    // These calls use service credentials from .env, not user-specific authentication
    const devicePromises = accessibleDevices.map(async device => {
      try {
        const deviceData = await deviceApiService.getDevice(device.id_type, device.device_id);

        // Log Device API call to audit log
        await auditLogService.log({
          user_id: userId,
          action: 'device_access',
          resource_type: 'device',
          resource_id: device.device_id,
          external_api: 'device',
          request_method: 'GET',
          request_path: `/device/${device.id_type}/${device.device_id}`,
          request_body: { id_type: device.id_type, id: device.device_id },
          response_body: sanitizeResponseBody(deviceData),
          response_status: 200,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });

        // Extract cs_no from Device Read API response
        const csNo = deviceData.cs_no || deviceData.csNo || null;

        let accountName = null;

        // If cs_no is available, fetch account details from Account API
        if (csNo) {
          try {
            const accountData = await accountApiService.getAccount(csNo);
            accountName = accountData?.name || null;

            // Log Account API call to audit log
            await auditLogService.log({
              user_id: userId,
              action: 'account_access',
              resource_type: 'account',
              resource_id: csNo,
              external_api: 'account',
              request_method: 'GET',
              request_path: `/acct/${csNo}`,
              request_body: { cs_no: csNo },
              response_body: sanitizeResponseBody(accountData),
              response_status: 200,
              ip_address: req.ip,
              user_agent: req.get('user-agent'),
            });
          } catch (accountError) {
            // Log account API errors but don't fail the device fetch
            logger.warn(`Failed to fetch account details for cs_no ${csNo}:`, {
              error: accountError.message,
              device_id: device.device_id,
            });

            // Log failed Account API call to audit log
            await auditLogService.log({
              user_id: userId,
              action: 'account_access',
              resource_type: 'account',
              resource_id: csNo,
              external_api: 'account',
              request_method: 'GET',
              request_path: `/acct/${csNo}`,
              request_body: { cs_no: csNo },
              response_body: accountError.response?.data
                ? sanitizeResponseBody(accountError.response.data)
                : null,
              response_status: accountError.response?.status || 500,
              ip_address: req.ip,
              user_agent: req.get('user-agent'),
              error_message: accountError.message,
            });
          }
        }

        // Normalize device data with account information; prefer user-set name if present
        const customDeviceName = customNameByDevice.get(`${device.device_id}|${device.id_type}`);
        return {
          ...dataNormalizationService.normalizeDevice(deviceData, {
            accountName,
            cs_no: csNo,
            id_type: device.id_type,
            device_id: device.device_id,
            customDeviceName: customDeviceName || undefined,
          }),
          id_type: device.id_type,
        };
      } catch (error) {
        // Log external API errors but don't fail the entire request
        // Note: External system is an integration service (device provider)
        // This call uses service credentials from .env, not user-specific authentication
        logger.error(`Error fetching device ${device.device_id} from Device API:`, {
          error: error.message,
          device_id: device.device_id,
          id_type: device.id_type,
        });

        // Log failed Device API call to audit log
        await auditLogService.log({
          user_id: userId,
          action: 'device_access',
          resource_type: 'device',
          resource_id: device.device_id,
          external_api: 'device',
          request_method: 'GET',
          request_path: `/device/${device.id_type}/${device.device_id}`,
          request_body: { id_type: device.id_type, id: device.device_id },
          response_body: error.response?.data ? sanitizeResponseBody(error.response.data) : null,
          response_status: error.response?.status || 500,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          error_message: error.message,
        });

        return null;
      }
    });

    const devices = (await Promise.all(devicePromises)).filter(device => device !== null);

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedDevices = devices.slice(startIndex, endIndex);

    res.status(200).json({
      devices: paginatedDevices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: devices.length,
        totalPages: Math.ceil(devices.length / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error in get-devices:', error);

    // Differentiate internal errors from external API errors
    if (error.response) {
      // External API error
      return res.status(500).json({
        error: 'Unable to fetch device information',
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

module.exports = getDevices;

const deviceApiService = require('../../services/device-api.service');
const accountApiService = require('../../services/account-api.service');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIdType } = require('../../utils/validators');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getDeviceRecent = async (req, res) => {
  try {
    const { id_type, id } = req.params;
    const userId = req.user_id;

    // Validate id_type
    if (!isValidIdType(id_type)) {
      return res
        .status(400)
        .json({ error: 'Invalid id_type. Must be: imei, serial, uuid, or iccid' });
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
      const deviceRecent = await deviceApiService.getDeviceRecent(id_type, id);

      // Extract cs_no from Device Read API response
      // cs_no is used to fetch account details (device name, user name) from Account API
      const csNo = deviceRecent.cs_no || deviceRecent.csNo || null;

      let accountData = null;
      let accountName = null;

      // If cs_no is available, fetch account details from Account API
      if (csNo) {
        try {
          accountData = await accountApiService.getAccount(csNo);
          // Extract account name from Account API response
          accountName = accountData?.name || null;
          logger.debug(`Fetched account details for cs_no: ${csNo}`, {
            account_name: accountName,
            user_id: userId,
          });

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
          logger.warn('Failed to fetch account details from Account API:', {
            error: accountError.message,
            cs_no: csNo,
            user_id: userId,
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

          // Continue without account data - device info is still available
        }
      } else {
        logger.debug('No cs_no found in Device Read API response', {
          id_type: id_type,
          id: id,
          user_id: userId,
        });
      }

      // Normalize device data - pass id_type and id from request params since response may not include them
      const normalized = dataNormalizationService.normalizeDevice(deviceRecent, {
        accountName: accountName,
        cs_no: csNo,
        id_type: id_type,
        device_id: id,
      });

      // Add account name to normalized device data if available
      // This ensures Device Name and User Name come from external APIs
      if (accountName) {
        normalized.account_name = accountName;
        // If device name is not set, use account name as device name
        if (!normalized.name || normalized.name === 'Unnamed Device') {
          normalized.name = accountName;
        }
      }

      // Include cs_no in response if available
      if (csNo) {
        normalized.cs_no = csNo;
      }

      // Log audit entry
      await auditLogService.log({
        user_id: userId,
        action: 'device_recent_access',
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
        device: normalized,
      });
    } catch (error) {
      logger.error('Error fetching recent device from Device API:', {
        error: error.message,
        id_type: id_type,
        id: id,
        user_id: userId,
      });

      // Differentiate between external service errors and internal errors
      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      res.status(500).json({
        error: 'Unable to fetch device information',
        message: isExternalError
          ? 'The device service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching device information. Please try again later.',
      });
    }
  } catch (error) {
    logger.error('Error in get-device-recent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = getDeviceRecent;

const deviceApiService = require('../../services/device-api.service');
const accountApiService = require('../../services/account-api.service');
const accessControlService = require('../../services/access-control.service');
const dataNormalizationService = require('../../services/data-normalization.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { isValidIMEI } = require('../../utils/validators');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getDeviceMetadata = async (req, res) => {
  try {
    const { imei } = req.params;
    const userId = req.user_id;

    if (!imei) {
      return res.status(400).json({ error: 'IMEI is required' });
    }

    if (!isValidIMEI(imei)) {
      return res.status(400).json({ error: 'Invalid IMEI format' });
    }

    const canAccess = await accessControlService.canUserAccessDevice(userId, imei, 'imei', {
      userType: req.user_type,
    });
    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this device',
      });
    }

    try {
      const device = await deviceApiService.getDevice('imei', imei);
      const csNo = device.cs_no || device.csNo || null;

      let accountName = null;
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
          logger.warn('Failed to fetch account details for metadata:', {
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
        }
      }

      const normalized = dataNormalizationService.normalizeDevice(device, {
        accountName,
        cs_no: csNo,
      });

      await auditLogService.log({
        user_id: userId,
        action: 'device_metadata_access',
        resource_type: 'device',
        resource_id: imei,
        external_api: 'device',
        request_method: 'GET',
        request_path: `/device/imei/${imei}`,
        request_body: { id_type: 'imei', id: imei },
        response_body: sanitizeResponseBody(device),
        response_status: 200,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(200).json({
        device_id: imei,
        id_type: 'imei',
        cs_no: csNo,
        metadata: normalized.metadata || {},
        device: normalized,
      });
    } catch (error) {
      logger.error('Error fetching device metadata from Device API:', {
        error: error.message,
        imei,
        user_id: userId,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      res.status(500).json({
        error: 'Unable to fetch device metadata',
        message: isExternalError
          ? 'The device service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching device metadata. Please try again later.',
      });
    }
  } catch (error) {
    logger.error('Error in get-device-metadata:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getDeviceMetadata;

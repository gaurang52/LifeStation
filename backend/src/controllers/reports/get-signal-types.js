const reportsApiService = require('../../services/reports-api.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const getSignalTypes = async (req, res) => {
  try {
    const userId = req.user_id;

    let signalTypes;
    try {
      signalTypes = await reportsApiService.getSignalTypes();
    } catch (error) {
      logger.error('Error fetching signal types from Reports API:', {
        error: error.message,
      });

      // Log failed external API call to audit log
      await auditLogService.log({
        user_id: userId,
        action: 'reports_signal_types_access',
        resource_type: 'reports',
        resource_id: 'signal_types',
        external_api: 'reports',
        request_method: 'GET',
        request_path: '/report/signal_types',
        request_body: {},
        response_body: error.response?.data ? sanitizeResponseBody(error.response.data) : null,
        response_status: error.response?.status || 500,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        error_message: error.message,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch signal types',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching signal types. Please try again later.',
      });
    }

    await auditLogService.log({
      user_id: userId,
      action: 'reports_signal_types_access',
      resource_type: 'reports',
      resource_id: 'signal_types',
      external_api: 'reports',
      request_method: 'GET',
      request_path: '/report/signal_types',
      request_body: {},
      response_body: sanitizeResponseBody(signalTypes),
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      signal_types: signalTypes || [],
    });
  } catch (error) {
    logger.error('Error in get-signal-types:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getSignalTypes;

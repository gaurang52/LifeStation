const reportsApiService = require('../../services/reports-api.service');
const deviceContextService = require('../../services/device-context.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

const extractReportList = reportData => {
  if (!reportData) {
    return [];
  }

  if (Array.isArray(reportData)) {
    return reportData;
  }

  if (Array.isArray(reportData.recent)) {
    return reportData.recent;
  }

  if (Array.isArray(reportData.reports)) {
    return reportData.reports;
  }

  if (Array.isArray(reportData.data)) {
    return reportData.data;
  }

  if (Array.isArray(reportData.signals)) {
    return reportData.signals;
  }

  return [];
};

const getRecentReports = async (req, res) => {
  try {
    const { device_id, id_type } = req.query;
    const userId = req.user_id;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const { device, canAccess, csNo } = await deviceContextService.resolveDeviceContext({
      userId,
      deviceId: device_id,
      idType: id_type || null,
      userType: req.user_type,
    });

    if (!device) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'The specified device was not found in the system',
      });
    }

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access reports for this device',
      });
    }

    if (!csNo) {
      return res.status(404).json({
        error: 'Reports unavailable',
        message: 'Device is not yet configured for reporting. Please contact support.',
      });
    }

    let recentData;
    try {
      recentData = await reportsApiService.getRecentReports(csNo);
    } catch (error) {
      logger.error('Error fetching recent reports from Reports API:', {
        error: error.message,
        cs_no: csNo,
        device_id: device.device_id,
      });

      // Log failed external API call to audit log
      await auditLogService.log({
        user_id: userId,
        action: 'reports_recent_access',
        resource_type: 'reports',
        resource_id: csNo,
        external_api: 'reports',
        request_method: 'GET',
        request_path: `/report/recent/${csNo}`,
        request_body: { cs_no: csNo },
        response_body: error.response?.data ? sanitizeResponseBody(error.response.data) : null,
        response_status: error.response?.status || 500,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        error_message: error.message,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch reports',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while fetching reports. Please try again later.',
      });
    }

    const reports = extractReportList(recentData);

    await auditLogService.log({
      user_id: userId,
      action: 'reports_recent_access',
      resource_type: 'reports',
      resource_id: csNo,
      external_api: 'reports',
      request_method: 'GET',
      request_path: `/report/recent/${csNo}`,
      request_body: { cs_no: csNo },
      response_body: sanitizeResponseBody(recentData),
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      reports,
      count: reports.length,
      device_id: device.device_id,
      cs_no: csNo,
    });
  } catch (error) {
    logger.error('Error in get-recent-reports:', error);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getRecentReports;

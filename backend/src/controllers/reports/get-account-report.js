const db = require('../../models');
const reportsApiService = require('../../services/reports-api.service');
const accountApiService = require('../../services/account-api.service');
const auditLogService = require('../../services/audit-log.service');
const logger = require('../../utils/logger');
const { sanitizeResponseBody } = require('../../utils/audit-sanitizer');

/**
 * GET /reports/account - Create, poll until ready, and return account report.
 * Matches ReportsAPI.postman_collection.json "Accounts Create" → "Accounts Ready" → "Accounts Get".
 * Uses current user's cs_no to optionally include servco_no for scoped report.
 */
const getAccountReport = async (req, res) => {
  try {
    const userId = req.user_id;

    const user = await db.Users.findByPk(userId, {
      attributes: ['id', 'cs_no'],
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    }

    let servcoNo = null;
    if (user.cs_no) {
      try {
        const servcoData = await accountApiService.getServcoNo(user.cs_no);
        servcoNo = servcoData?.servco_no ?? servcoData?.servco ?? servcoData?.servcoNo ?? null;
      } catch (servcoError) {
        logger.warn('Could not get servco_no for account report (non-blocking):', {
          cs_no: user.cs_no,
          message: servcoError.message,
        });
      }
    }

    const params = {
      reportTitle: `Accounts_${user.id}_${Date.now() % 1e6}`.slice(0, 40),
      oosStatus: 'Both',
      showAddress: true,
      showPhones: true,
    };
    if (servcoNo) params.servcoNo = String(servcoNo).trim();

    let reportData;
    try {
      reportData = await reportsApiService.getAccountReportFlow(params);
    } catch (error) {
      logger.error('Error fetching account report from Reports API:', {
        error: error.message,
        user_id: userId,
      });

      await auditLogService.log({
        user_id: userId,
        action: 'reports_account_access',
        resource_type: 'reports',
        resource_id: 'account',
        external_api: 'reports',
        request_method: 'POST',
        request_path: '/report/account',
        request_body: { reportTitle: params.reportTitle },
        response_body: error.response?.data ? sanitizeResponseBody(error.response.data) : null,
        response_status: error.response?.status || 500,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        error_message: error.message,
      });

      const isExternalError = error.response?.status >= 400 && error.response?.status < 500;
      return res.status(500).json({
        error: 'Unable to fetch account report',
        message: isExternalError
          ? 'The reporting service is currently unavailable. Please try again later.'
          : 'An error occurred while generating the account report. Please try again later.',
      });
    }

    await auditLogService.log({
      user_id: userId,
      action: 'reports_account_access',
      resource_type: 'reports',
      resource_id: 'account',
      external_api: 'reports',
      request_method: 'GET',
      request_path: '/reports/account',
      response_status: 200,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    return res.status(200).json({
      data: reportData,
      message: 'Account report retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in get-account-report:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  }
};

module.exports = getAccountReport;

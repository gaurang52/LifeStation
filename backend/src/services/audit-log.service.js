const db = require('../models');
const logger = require('../utils/logger');

class AuditLogService {
  /**
   * Log an audit entry
   * @param {object} logData - Audit log data
   * @returns {Promise<void>}
   */
  async log(logData) {
    try {
      await db.AuditLogs.create({
        user_id: logData.user_id || null,
        action: logData.action,
        resource_type: logData.resource_type || null,
        resource_id: logData.resource_id || null,
        external_api: logData.external_api || null,
        request_method: logData.request_method || null,
        request_path: logData.request_path || null,
        response_status: logData.response_status || null,
        ip_address: logData.ip_address || null,
        user_agent: logData.user_agent || null,
        request_body: logData.request_body || null,
        response_body: logData.response_body || null,
        error_message: logData.error_message || null,
      });
    } catch (error) {
      // Don't throw error, just log it
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log external API call
   * @param {object} params - API call parameters
   * @returns {Promise<void>}
   */
  async logApiCall(params) {
    await this.log({
      user_id: params.user_id,
      action: 'api_call',
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      external_api: params.external_api,
      request_method: params.method,
      request_path: params.path,
      response_status: params.status,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      request_body: params.request_body,
      response_body: params.response_body,
      error_message: params.error_message,
    });
  }

  /**
   * Log access attempt
   * @param {object} params - Access attempt parameters
   * @returns {Promise<void>}
   */
  async logAccess(params) {
    await this.log({
      user_id: params.user_id,
      action: params.action || 'access',
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      external_api: params.external_api,
      request_method: params.method,
      request_path: params.path,
      response_status: params.status,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      error_message: params.error_message,
    });
  }
}

module.exports = new AuditLogService();

/**
 * Reports API Service
 *
 * ARCHITECTURE NOTE:
 * ==================
 * The external system is treated as an INTEGRATION SERVICE (reports provider),
 * NOT a user management platform.
 *
 * Key Principles:
 * - All external API calls use SERVICE-LEVEL credentials from .env (EXTERNAL_API_USERNAME, EXTERNAL_API_PASSWORD)
 * - External API credentials are used solely for accessing report data
 * - Do NOT associate external API calls with individual internal users
 * - Internal users are managed only within our system
 * - Report-to-user mapping is maintained entirely within our backend database
 */

const axios = require('axios');
const externalApiTokenService = require('./external-api-token.service');
const { retry } = require('../utils/retry');
const logger = require('../utils/logger');
const externalApiConfig = require('../config/external-apis');

class ReportsApiService {
  constructor() {
    this.config = externalApiConfig.reports;
    this.clientId = this.config.clientId;
  }

  /**
   * Get OAuth2 access token using service-level credentials
   * Note: Uses EXTERNAL_API_USERNAME and EXTERNAL_API_PASSWORD from .env
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    return await externalApiTokenService.getToken('reports', this.clientId);
  }

  /**
   * Make authenticated request to Reports API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   * @param {number} retries - Number of retries
   * @returns {Promise<any>} - API response data
   */
  async makeRequest(method, endpoint, data = null, retries = 3) {
    const token = await this.getAccessToken();
    const startTime = Date.now();

    const config = {
      method,
      url: `${this.config.baseURL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    };

    // Only set Content-Type for requests with data (not GET queries or empty bodies)
    if (data && method !== 'GET') {
      config.headers['Content-Type'] = 'application/json';
    }

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    logger.info('External API request initiated', {
      external_api: 'reports',
      method,
      endpoint,
    });

    try {
      const result = await retry(
        async () => {
          try {
            const response = await axios(config);
            return { data: response.data, status: response.status };
          } catch (error) {
            if (error.response?.status === 401) {
              // Token expired, refresh and retry
              await externalApiTokenService.refreshToken('reports', this.clientId);
              throw error; // Retry will use new token
            }
            throw error;
          }
        },
        retries,
        1000,
      );

      logger.info('External API request succeeded', {
        external_api: 'reports',
        method,
        endpoint,
        status: result.status,
        duration_ms: Date.now() - startTime,
      });

      return result.data;
    } catch (error) {
      logger.error('External API request failed', {
        external_api: 'reports',
        method,
        endpoint,
        status: error.response?.status,
        error_code: error.code,
        message: error.message,
        duration_ms: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get recent reports for account
   * @param {string} csNo - Customer service number
   * @returns {Promise<object>} - Recent reports data
   */
  async getRecentReports(csNo) {
    return await this.makeRequest('GET', `/report/recent/${csNo}`);
  }

  /**
   * Create history report request
   * @param {object} reportParams - Report parameters
   * @returns {Promise<object>} - Report creation result with report_id
   */
  async createHistoryReport(reportParams) {
    return await this.makeRequest('POST', '/report/history', reportParams);
  }

  /**
   * Check if history report is ready
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} - Report status
   */
  async getHistoryReportStatus(reportId) {
    return await this.makeRequest('GET', `/report/history/${reportId}/ready`);
  }

  /**
   * Get history report data
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} - Report data
   */
  async getHistoryReport(reportId) {
    return await this.makeRequest('GET', `/report/history/${reportId}`);
  }

  /**
   * Create account report request
   * @param {object} reportParams - Report parameters
   * @returns {Promise<object>} - Report creation result with report_id
   */
  async createAccountReport(reportParams) {
    return await this.makeRequest('POST', '/report/account', reportParams);
  }

  /**
   * Check if account report is ready
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} - Report status
   */
  async getAccountReportStatus(reportId) {
    return await this.makeRequest('GET', `/report/account/${reportId}/ready`);
  }

  /**
   * Get account report data
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} - Report data
   */
  async getAccountReport(reportId) {
    return await this.makeRequest('GET', `/report/account/${reportId}`);
  }

  /**
   * Get available signal types
   * @returns {Promise<Array>} - Signal types list
   */
  async getSignalTypes() {
    return await this.makeRequest('GET', '/report/signal_types');
  }

  /**
   * Create and fetch event history report
   * This is a convenience method that creates a history report, waits for it to be ready,
   * and returns the data.
   *
   * @param {object} params - Report parameters
   * @param {string} params.csNo - Customer service number (for single account)
   * @param {string} params.before - End date (YYYY-MM-DD HH:mm:ss)
   * @param {string} params.after - Start date (YYYY-MM-DD HH:mm:ss)
   * @param {Array<string>} params.signalTypes - Signal types to include (optional)
   * @param {string} params.servcoNo - Service company number (optional)
   * @returns {Promise<object>} - Event history data
   */
  async getEventHistory(params) {
    const { csNo, before, after, signalTypes, servcoNo } = params;

    // Build request body matching Postman collection
    const reportParams = {
      before: before || this.formatDate(new Date()),
      after: after || this.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Default: 30 days ago
      title: `Events_${csNo}_${Date.now()}`,
    };

    // If csNo provided, use it as range
    if (csNo) {
      reportParams.cs_start = csNo;
      reportParams.cs_end = csNo;
    }

    // Add signal types if provided
    if (signalTypes && Array.isArray(signalTypes) && signalTypes.length > 0) {
      reportParams.signal_type = signalTypes;
    }

    // Add servco_no if provided
    if (servcoNo) {
      reportParams.servco_no = servcoNo;
    }

    // Step 1: Create history report
    const createResponse = await this.createHistoryReport(reportParams);
    const reportId = createResponse.report_id;

    if (!reportId) {
      throw new Error('Failed to create history report: No report_id returned');
    }

    // Step 2: Poll for report ready (with timeout)
    const maxAttempts = 30;
    const pollInterval = 1000; // 1 second
    let attempts = 0;
    let isReady = false;

    while (attempts < maxAttempts && !isReady) {
      attempts++;
      const statusResponse = await this.getHistoryReportStatus(reportId);
      isReady = statusResponse.ready === true || statusResponse.status === 'ready';

      if (!isReady) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!isReady) {
      throw new Error('History report generation timed out');
    }

    // Step 3: Get report data
    return await this.getHistoryReport(reportId);
  }

  /**
   * Format date for Reports API
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date (YYYY-MM-DD HH:mm:ss)
   */
  formatDate(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

module.exports = new ReportsApiService();

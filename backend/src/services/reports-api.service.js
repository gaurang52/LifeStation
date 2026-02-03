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
   * @param {object} [options] - Optional: { returnFullResponse: true } to return { data, status }
   * @returns {Promise<any>} - API response data, or { data, status } when returnFullResponse is true
   */
  async makeRequest(method, endpoint, data = null, retries = 3, options = {}) {
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

      if (options.returnFullResponse) {
        return result;
      }
      return result.data;
    } catch (error) {
      logger.error('External API request failed', {
        external_api: 'reports',
        method,
        endpoint,
        status: error.response?.status,
        response_data: error.response?.data,
        error_code: error.code,
        message: error.message,
        duration_ms: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get recent reports for account.
   * Matches ReportsAPI.postman_collection.json "Recent": GET /report/recent/{{cs_no}}, Bearer only, no body.
   * @param {string} csNo - Customer service number (path segment)
   * @returns {Promise<object>} - Recent reports data
   */
  async getRecentReports(csNo) {
    const path = `/report/recent/${encodeURIComponent(String(csNo).trim())}`;
    return await this.makeRequest('GET', path, null);
  }

  /**
   * Create history report request.
   * Matches ReportsAPI.postman_collection.json "History Create": POST /report/history, JSON body.
   * @param {object} reportParams - { before, after, cs_start, cs_end, title?, signal_type?, servco_no? }
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
   * Check if account report is ready. Returns full response so caller can use HTTP status.
   * External API may return 200 with a body that does not include ready/status fields.
   * @param {string} reportId - Report ID
   * @returns {Promise<{ data: any, status: number }>} - Response data and HTTP status
   */
  async getAccountReportStatus(reportId) {
    return await this.makeRequest('GET', `/report/account/${reportId}/ready`, null, 3, {
      returnFullResponse: true,
    });
  }

  /**
   * Get account report data. May throw on 400 "Report not ready" from external API.
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} - Report data
   */
  async getAccountReport(reportId) {
    return await this.makeRequest('GET', `/report/account/${reportId}`);
  }

  /**
   * Create and fetch account report (Accounts Create → Ready → Get).
   * Matches ReportsAPI.postman_collection.json "Accounts Create" flow.
   * Body per Postman: Report_Title, OOS_Status, ShowAddress, ShowPhones; optional: servco_no, corpacct_servco_no, active_date_start, active_date_end.
   *
   * @param {object} params - Report parameters
   * @param {string} [params.reportTitle] - Report_Title (default: "Accounts Report")
   * @param {string} [params.oosStatus] - OOS_Status: "Both" | "In Service" (default: "Both")
   * @param {boolean} [params.showAddress] - ShowAddress (default: true)
   * @param {boolean} [params.showPhones] - ShowPhones (default: true)
   * @param {string} [params.servcoNo] - servco_no (optional)
   * @param {string} [params.corpacctServcoNo] - corpacct_servco_no (optional)
   * @param {string} [params.activeDateStart] - active_date_start Y-m-d H:i:s (optional)
   * @param {string} [params.activeDateEnd] - active_date_end Y-m-d H:i:s (optional)
   * @returns {Promise<object>} - Account report data
   */
  async getAccountReportFlow(params = {}) {
    const {
      reportTitle = 'Accounts Report',
      oosStatus = 'Both',
      showAddress = true,
      showPhones = true,
      servcoNo,
      corpacctServcoNo,
      activeDateStart,
      activeDateEnd,
    } = params;

    const reportParams = {
      Report_Title: String(reportTitle).slice(0, 40),
      OOS_Status: oosStatus,
      ShowAddress: showAddress ? 'true' : 'false',
      ShowPhones: showPhones ? 'true' : 'false',
    };
    if (servcoNo) reportParams.servco_no = String(servcoNo).trim();
    if (corpacctServcoNo) reportParams.corpacct_servco_no = String(corpacctServcoNo).trim();
    if (activeDateStart) reportParams.active_date_start = activeDateStart;
    if (activeDateEnd) reportParams.active_date_end = activeDateEnd;

    const createResponse = await this.createAccountReport(reportParams);
    // Postman/API returns report_id; accept alternate casing from external API
    const reportId =
      createResponse.report_id ??
      createResponse.Report_ID ??
      createResponse.report_Id ??
      createResponse.Report_Id;

    if (!reportId) {
      logger.error('Account report create response missing report_id', {
        response_keys: createResponse ? Object.keys(createResponse) : [],
        response_sample: typeof createResponse === 'object' ? createResponse : createResponse,
      });
      throw new Error('Failed to create account report: No report_id returned');
    }

    // Poll GET report until 200. The /ready endpoint can return 200 before report is actually ready,
    // and GET /report/account/{id} returns 400 { msg: 'Report not ready.' } until ready.
    const maxAttempts = 60;
    const pollInterval = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.getAccountReport(reportId);
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.msg ?? err.response?.data?.message ?? '';
        const isNotReady =
          status === 400 &&
          (String(msg).toLowerCase().includes('not ready') ||
            String(msg).toLowerCase().includes('report not ready'));

        if (isNotReady && attempt < maxAttempts) {
          logger.info('Account report not ready yet, retrying', {
            report_id: reportId,
            attempt,
            maxAttempts,
          });
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Account report generation timed out');
  }

  /**
   * Get available signal types
   * @returns {Promise<Array>} - Signal types list
   */
  async getSignalTypes() {
    return await this.makeRequest('GET', '/report/signal_types');
  }

  /**
   * Create and fetch event history report.
   * Matches ReportsAPI.postman_collection.json "History Create" flow: POST body then GET .../ready then GET .../report_id.
   * Body fields per Postman: before, after, cs_start, cs_end, title (max 40 chars), signal_type (optional), servco_no (optional).
   *
   * @param {object} params - Report parameters
   * @param {string} params.csNo - Customer service number (for single account → cs_start/cs_end)
   * @param {string} params.before - End date (YYYY-MM-DD HH:mm:ss)
   * @param {string} params.after - Start date (YYYY-MM-DD HH:mm:ss)
   * @param {Array<string>} params.signalTypes - Signal types to include (optional)
   * @param {string} params.servcoNo - Service company number (optional)
   * @returns {Promise<object>} - Event history data
   */
  async getEventHistory(params) {
    const { csNo, before, after, signalTypes, servcoNo } = params;

    // Build request body matching Postman "History Create" raw JSON (before, after, cs_start, cs_end, title, signal_type, servco_no)
    const reportParams = {
      before: before || this.formatDate(new Date()),
      after: after || this.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Default: today - 30 days per API doc
      title: this.buildHistoryTitle(csNo),
    };

    if (csNo) {
      const cs = String(csNo).trim();
      reportParams.cs_start = cs;
      reportParams.cs_end = cs;
    }

    if (signalTypes && Array.isArray(signalTypes) && signalTypes.length > 0) {
      reportParams.signal_type = signalTypes;
    }

    if (servcoNo) {
      reportParams.servco_no = String(servcoNo).trim();
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
   * Build title for History report. API doc: title optional, max 40 chars.
   * @param {string} csNo - Customer service number
   * @returns {string} - Title string, max 40 characters
   */
  buildHistoryTitle(csNo) {
    const base = `Rpt_${String(csNo || '')
      .trim()
      .slice(0, 12)}_${Date.now() % 1e9}`;
    return base.slice(0, 40);
  }

  /**
   * Format date for Reports API (Postman example: "2017-10-11 00:00:00").
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

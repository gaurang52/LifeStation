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
   * Get OAuth2 access token
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

    return await retry(
      async () => {
        try {
          const response = await axios(config);
          return response.data;
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
}

module.exports = new ReportsApiService();

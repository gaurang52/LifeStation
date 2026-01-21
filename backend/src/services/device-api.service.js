const axios = require('axios');
const externalApiTokenService = require('./external-api-token.service');
const { retry } = require('../utils/retry');
const logger = require('../utils/logger');
const externalApiConfig = require('../config/external-apis');

class DeviceApiService {
  constructor() {
    this.config = externalApiConfig.device;
    this.clientId = this.config.clientId;
  }

  /**
   * Get OAuth2 access token
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    return await externalApiTokenService.getToken('device', this.clientId);
  }

  /**
   * Make authenticated request to Device API
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
            await externalApiTokenService.refreshToken('device', this.clientId);
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
   * Get devices list
   * @param {object} filters - Query filters (page, servco, status, corp_id)
   * @returns {Promise<object>} - Devices list
   */
  async getDevices(filters = {}) {
    return await this.makeRequest('GET', '/device', filters);
  }

  /**
   * Get device by ID
   * @param {string} idType - ID type ('imei', 'serial', 'uuid')
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Device data
   */
  async getDevice(idType, id) {
    return await this.makeRequest('GET', `/device/${idType}/${id}`);
  }

  /**
   * Get most recent device information
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Recent device data
   */
  async getDeviceRecent(idType, id) {
    return await this.makeRequest('GET', `/device/${idType}/${id}/recent`);
  }

  /**
   * Add device
   * @param {object} deviceData - Device data
   * @returns {Promise<object>} - Created device
   */
  async addDevice(deviceData) {
    return await this.makeRequest('PUT', '/device/', deviceData);
  }

  /**
   * Request device signal
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Signal result
   */
  async requestDeviceSignal(idType, id) {
    return await this.makeRequest('POST', `/device/${idType}/${id}/signal`);
  }

  /**
   * Get fall detection status
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Fall detection status
   */
  async getFallDetection(idType, id) {
    return await this.makeRequest('GET', `/device/${idType}/${id}/falldetection`);
  }

  /**
   * Turn on fall detection
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Update result
   */
  async turnOnFallDetection(idType, id) {
    return await this.makeRequest('PUT', `/device/${idType}/${id}/falldetection`);
  }

  /**
   * Turn off fall detection
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Update result
   */
  async turnOffFallDetection(idType, id) {
    return await this.makeRequest('DELETE', `/device/${idType}/${id}/falldetection`);
  }

  /**
   * Reboot device
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Reboot result
   */
  async rebootDevice(idType, id) {
    return await this.makeRequest('GET', `/device/${idType}/${id}/reboot`);
  }

  /**
   * Get SIM information
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - SIM data
   */
  async getSIM(idType, id) {
    return await this.makeRequest('GET', `/sim/${idType}/${id}`);
  }

  /**
   * Activate SIM
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Activation result
   */
  async activateSIM(idType, id) {
    return await this.makeRequest('PUT', `/sim/${idType}/${id}/activate`);
  }

  /**
   * Deactivate SIM
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Deactivation result
   */
  async deactivateSIM(idType, id) {
    return await this.makeRequest('DELETE', `/sim/${idType}/${id}/deactivate`);
  }
}

module.exports = new DeviceApiService();

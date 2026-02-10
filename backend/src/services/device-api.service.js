/**
 * Device API Service
 *
 * ARCHITECTURE NOTE:
 * ==================
 * The external system is treated as an INTEGRATION SERVICE (device provider),
 * NOT a user management platform.
 *
 * Key Principles:
 * - All external API calls use SERVICE-LEVEL credentials from .env (EXTERNAL_API_USERNAME, EXTERNAL_API_PASSWORD)
 * - External API credentials are used solely for accessing device data
 * - Do NOT associate external API calls with individual internal users
 * - Internal users are managed only within our system
 * - Device-to-user mapping is maintained entirely within our backend database
 */

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
   * Get OAuth2 access token using service-level credentials
   * Note: Uses EXTERNAL_API_USERNAME and EXTERNAL_API_PASSWORD from .env
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
      external_api: 'device',
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
              await externalApiTokenService.refreshToken('device', this.clientId);
              throw error; // Retry will use new token
            }
            throw error;
          }
        },
        retries,
        1000,
      );

      logger.info('External API request succeeded', {
        external_api: 'device',
        method,
        endpoint,
        status: result.status,
        duration_ms: Date.now() - startTime,
      });

      return result.data;
    } catch (error) {
      logger.error('External API request failed', {
        external_api: 'device',
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
   * Get devices list
   * @param {object} filters - Query filters (page, servco, status, corp_id)
   * @returns {Promise<object>} - Devices list
   */
  async getDevices(filters = {}) {
    return await this.makeRequest('GET', '/device', filters);
  }

  /**
   * Check if Device API returned an error payload (HTTP 200 but status: "error", no device data).
   * Throws when device is not found. Does NOT throw when we have device data (even if device.status is "error").
   */
  _checkDeviceApiErrorResponse(data, idType, id) {
    if (!data) return;
    const hasDeviceData = data.device_id || (data.device && data.device.device_id);
    if (data.status === 'error' && !hasDeviceData) {
      const errors = data.errors || [];
      const msg = errors.length ? errors.join('; ') : 'Device not found';
      const err = new Error(msg);
      err.code = 'DEVICE_NOT_FOUND';
      err.idType = idType;
      err.id = id;
      throw err;
    }
  }

  /**
   * Get device by ID
   * @param {string} idType - ID type ('imei', 'serial', 'uuid')
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Device data
   * @throws {Error} with code DEVICE_NOT_FOUND when Device API returns status "error" / "No device found"
   */
  async getDevice(idType, id) {
    const data = await this.makeRequest('GET', `/device/${idType}/${id}`);
    this._checkDeviceApiErrorResponse(data, idType, id);
    // Unwrap { device: {...} } if present, otherwise return data as-is
    return data.device != null ? data.device : data;
  }

  /**
   * Get most recent device information
   * @param {string} idType - ID type
   * @param {string} id - Device ID
   * @returns {Promise<object>} - Recent device data
   * @throws {Error} with code DEVICE_NOT_FOUND when Device API returns status "error" / "No device found"
   */
  async getDeviceRecent(idType, id) {
    const data = await this.makeRequest('GET', `/device/${idType}/${id}/recent`);
    this._checkDeviceApiErrorResponse(data, idType, id);
    return data.device != null ? data.device : data;
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

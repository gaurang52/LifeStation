const axios = require('axios');
const db = require('../models');
const encryption = require('../utils/encryption');
const logger = require('../utils/logger');
const externalApiConfig = require('../config/external-apis');
const { retry } = require('../utils/retry');

class ExternalApiTokenService {
  /**
   * Get or refresh OAuth2 token for external API
   * @param {string} apiName - API name ('account', 'device', 'reports')
   * @param {string} clientId - Client ID
   * @returns {Promise<string>} - Access token
   */
  async getToken(apiName, clientId) {
    const config = externalApiConfig[apiName];
    if (!config) {
      throw new Error(`Invalid API name: ${apiName}`);
    }

    // Get token from DB
    const tokenRecord = await db.ExternalApiTokens.findOne({
      where: { api_name: apiName, client_id: clientId },
    });

    if (!tokenRecord) {
      return await this.authenticate(apiName, clientId);
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiresAt <= new Date(now.getTime() + bufferTime)) {
      return await this.refreshToken(apiName, clientId);
    }

    // Decrypt and return token
    try {
      return encryption.decrypt(tokenRecord.access_token_encrypted);
    } catch (error) {
      logger.error('Error decrypting token, re-authenticating:', error);
      return await this.authenticate(apiName, clientId);
    }
  }

  /**
   * Authenticate and get new token
   * @param {string} apiName - API name
   * @param {string} clientId - Client ID
   * @returns {Promise<string>} - Access token
   */
  async authenticate(apiName, clientId) {
    const config = externalApiConfig[apiName];
    if (!config) {
      throw new Error(`Invalid API name: ${apiName}`);
    }

    // Validate baseURL
    if (!config.baseURL || !config.baseURL.startsWith('https://')) {
      throw new Error(`Invalid baseURL for ${apiName} API: ${config.baseURL}`);
    }

    // Construct full URL
    const tokenURL = `${config.baseURL}${config.tokenEndpoint}`;

    // Validate URL format
    try {
      new URL(tokenURL);
    } catch (error) {
      logger.error(`Invalid URL constructed for ${apiName} API: ${tokenURL}`);
      throw new Error(`Invalid URL format: ${tokenURL}`);
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', config.username);
    formData.append('password', config.password);
    formData.append('client_id', clientId);

    logger.debug(`Authenticating with ${apiName} API at ${tokenURL}`);

    try {
      const response = await retry(
        async () => {
          return await axios.post(tokenURL, formData.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
          });
        },
        3,
        1000,
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Encrypt tokens
      const encryptedAccessToken = encryption.encryptToString(access_token);
      const encryptedRefreshToken = refresh_token
        ? encryption.encryptToString(refresh_token)
        : null;

      // Calculate expiration
      const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

      // Store in DB
      await db.ExternalApiTokens.upsert({
        api_name: apiName,
        client_id: clientId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        expires_at: expiresAt,
      });

      logger.info(`Authenticated with ${apiName} API`);
      return access_token;
    } catch (error) {
      logger.error(`Error authenticating with ${apiName} API:`, error);
      throw new Error(`Failed to authenticate with ${apiName} API: ${error.message}`);
    }
  }

  /**
   * Refresh OAuth2 token
   * @param {string} apiName - API name
   * @param {string} clientId - Client ID
   * @returns {Promise<string>} - New access token
   */
  async refreshToken(apiName, clientId) {
    const config = externalApiConfig[apiName];
    if (!config) {
      throw new Error(`Invalid API name: ${apiName}`);
    }

    const tokenRecord = await db.ExternalApiTokens.findOne({
      where: { api_name: apiName, client_id: clientId },
    });

    if (!tokenRecord || !tokenRecord.refresh_token_encrypted) {
      return await this.authenticate(apiName, clientId);
    }

    try {
      const refreshToken = encryption.decrypt(tokenRecord.refresh_token_encrypted);

      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('client_id', clientId);
      formData.append('refresh_token', refreshToken);

      const response = await retry(
        async () => {
          return await axios.post(
            `${config.baseURL}${config.refreshEndpoint}`,
            formData.toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 30000,
            },
          );
        },
        3,
        1000,
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Update tokens
      const encryptedAccessToken = encryption.encryptToString(access_token);
      const encryptedRefreshToken = refresh_token
        ? encryption.encryptToString(refresh_token)
        : tokenRecord.refresh_token_encrypted;

      const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

      await db.ExternalApiTokens.update(
        {
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          expires_at: expiresAt,
        },
        {
          where: { api_name: apiName, client_id: clientId },
        },
      );

      logger.info(`Refreshed token for ${apiName} API`);
      return access_token;
    } catch (error) {
      logger.error(`Error refreshing token for ${apiName} API:`, error);
      // If refresh fails, try to authenticate again
      return await this.authenticate(apiName, clientId);
    }
  }
}

module.exports = new ExternalApiTokenService();

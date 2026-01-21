const axios = require('axios');
const externalApiTokenService = require('./external-api-token.service');
const { retry } = require('../utils/retry');
const logger = require('../utils/logger');
const externalApiConfig = require('../config/external-apis');

class AccountApiService {
  constructor() {
    this.config = externalApiConfig.account;
    this.clientId = this.config.clientId;
  }

  /**
   * Get OAuth2 access token
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    return await externalApiTokenService.getToken('account', this.clientId);
  }

  /**
   * Make authenticated request to Account API
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
            await externalApiTokenService.refreshToken('account', this.clientId);
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
   * Get account by cs_no
   * @param {string} csNo - Customer service number
   * @returns {Promise<object>} - Account data
   */
  async getAccount(csNo) {
    return await this.makeRequest('GET', `/acct/${csNo}`);
  }

  /**
   * List accounts
   * @param {object} filters - Query filters
   * @returns {Promise<object>} - Accounts list
   */
  async getAccounts(filters = {}) {
    return await this.makeRequest('GET', '/acct/', filters);
  }

  /**
   * Create account
   * @param {object} accountData - Account data
   * @returns {Promise<object>} - Created account
   */
  async createAccount(accountData) {
    return await this.makeRequest('PUT', '/acct/', accountData);
  }

  /**
   * Update account
   * @param {string} csNo - Customer service number
   * @param {object} updates - Account updates
   * @returns {Promise<object>} - Updated account
   */
  async updateAccount(csNo, updates) {
    return await this.makeRequest('POST', `/acct/${csNo}`, updates);
  }

  /**
   * Activate account
   * @param {string} csNo - Customer service number
   * @returns {Promise<object>} - Activation result
   */
  async activateAccount(csNo) {
    return await this.makeRequest('POST', `/acct/${csNo}/activate`);
  }

  /**
   * Deactivate account
   * @param {string} csNo - Customer service number
   * @returns {Promise<object>} - Deactivation result
   */
  async deactivateAccount(csNo) {
    return await this.makeRequest('POST', `/acct/${csNo}/deactivate`);
  }

  /**
   * Link accounts (caregiver ↔ senior)
   * @param {string} csNo1 - First account cs_no
   * @param {string} csNo2 - Second account cs_no
   * @returns {Promise<object>} - Link result
   */
  async linkAccounts(csNo1, csNo2) {
    return await this.makeRequest('PUT', `/acct/link/${csNo1}/${csNo2}`);
  }

  /**
   * Get contacts for account
   * @param {string} csNo - Customer service number
   * @returns {Promise<Array>} - Contacts list
   */
  async getContacts(csNo) {
    return await this.makeRequest('GET', `/acct/${csNo}/contacts`);
  }

  /**
   * Create contact
   * @param {string} csNo - Customer service number
   * @param {object} contactData - Contact data
   * @returns {Promise<object>} - Created contact
   */
  async createContact(csNo, contactData) {
    return await this.makeRequest('PUT', `/acct/${csNo}/contacts/`, contactData);
  }

  /**
   * Update contact
   * @param {string} csNo - Customer service number
   * @param {string} contactNo - Contact number
   * @param {object} updates - Contact updates
   * @returns {Promise<object>} - Updated contact
   */
  async updateContact(csNo, contactNo, updates) {
    return await this.makeRequest('POST', `/acct/${csNo}/contacts/${contactNo}`, updates);
  }

  /**
   * Delete contact
   * @param {string} csNo - Customer service number
   * @param {string} contactNo - Contact number
   * @returns {Promise<object>} - Deletion result
   */
  async deleteContact(csNo, contactNo) {
    return await this.makeRequest('DELETE', `/acct/${csNo}/contacts/${contactNo}`);
  }

  /**
   * Get servco_no for account
   * @param {string} csNo - Customer service number
   * @returns {Promise<object>} - Servco data
   */
  async getServcoNo(csNo) {
    return await this.makeRequest('GET', `/acct/${csNo}/servco`);
  }

  /**
   * Set servco_no for account
   * @param {string} csNo - Customer service number
   * @param {string} servcoNo - Service company number
   * @returns {Promise<object>} - Update result
   */
  async setServcoNo(csNo, servcoNo) {
    return await this.makeRequest('POST', `/acct/${csNo}/servco`, {
      servco_no: servcoNo,
    });
  }

  /**
   * Search accounts
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Matching accounts
   */
  async searchAccounts(searchTerm) {
    return await this.makeRequest('GET', `/acct/search/${searchTerm}`);
  }
}

module.exports = new AccountApiService();

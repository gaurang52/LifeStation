/**
 * External API Configuration
 *
 * ARCHITECTURE NOTE:
 * ==================
 * The external system is treated as an INTEGRATION SERVICE (device/reports provider),
 * NOT a user management platform.
 *
 * All external API calls use SERVICE-LEVEL credentials from environment variables:
 * - EXTERNAL_API_USERNAME: Service account username
 * - EXTERNAL_API_PASSWORD: Service account password
 *
 * These credentials are shared across Account, Device, and Reports APIs and are NOT
 * associated with individual internal users.
 */

require('dotenv').config();

/**
 * Normalize base URL - handles cases where URL might include protocol, paths, or be just subdomain
 * @param {string} baseUrl - Base URL from environment variable
 * @returns {string} - Normalized base URL (without paths)
 */
function normalizeBaseURL(baseUrl) {
  if (!baseUrl) {
    throw new Error('EXTERNAL_API_BASE_URL is not set');
  }

  // Remove any existing protocol
  baseUrl = baseUrl.replace(/^https?:\/\//, '');

  // Extract only the hostname (remove any paths)
  // Split by '/' and take the first part
  const hostname = baseUrl.split('/')[0];

  // Remove trailing slash if any
  let normalized = hostname.replace(/\/$/, '');

  // If it doesn't already include .alertmessage.com, add it
  if (!normalized.includes('.alertmessage.com')) {
    normalized = `${normalized}.alertmessage.com`;
  }

  // Ensure it starts with https://
  return `https://${normalized}`;
}

const baseURL = normalizeBaseURL(process.env.EXTERNAL_API_BASE_URL);

module.exports = {
  account: {
    baseURL: baseURL,
    clientId: 'affiliated-api',
    username: process.env.EXTERNAL_API_USERNAME,
    password: process.env.EXTERNAL_API_PASSWORD,
    tokenEndpoint: '/token',
    refreshEndpoint: '/token/refresh',
  },
  device: {
    baseURL: baseURL,
    clientId: 'brighton-api',
    username: process.env.EXTERNAL_API_USERNAME,
    password: process.env.EXTERNAL_API_PASSWORD,
    tokenEndpoint: '/token',
    refreshEndpoint: '/token/refresh',
  },
  reports: {
    baseURL: baseURL,
    clientId: 'affiliated-report',
    username: process.env.EXTERNAL_API_USERNAME,
    password: process.env.EXTERNAL_API_PASSWORD,
    tokenEndpoint: '/token',
    refreshEndpoint: '/token/refresh',
  },
};

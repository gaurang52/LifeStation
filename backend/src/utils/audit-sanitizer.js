/**
 * Utility functions for sanitizing data before audit logging
 */

/**
 * Sanitize request body for audit logging (remove sensitive data)
 * @param {object} body - Request body
 * @returns {object} - Sanitized body
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token', 'authorization'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Sanitize response body for audit logging
 * Limits size and removes sensitive data to avoid storing huge responses
 * @param {object|array} body - Response body
 * @param {number} maxSize - Maximum size in bytes (default: 10000)
 * @returns {object|array|string} - Sanitized response body
 */
function sanitizeResponseBody(body, maxSize = 10000) {
  if (!body) {
    return null;
  }

  // If it's not an object or array, return as is (but limit string length)
  if (typeof body !== 'object') {
    const str = String(body);
    return str.length > 500 ? str.substring(0, 500) + '... [truncated]' : str;
  }

  // Stringify to check size
  const stringified = JSON.stringify(body);
  if (stringified.length <= maxSize) {
    // Size is acceptable, sanitize sensitive fields
    return sanitizeSensitiveFields(body);
  }

  // Response is too large, create a summary
  if (Array.isArray(body)) {
    return {
      _summary: `Array with ${body.length} items`,
      _sample: body.length > 0 ? sanitizeSensitiveFields(body[0]) : null,
      _truncated: true,
    };
  }

  // For objects, keep top-level keys but limit nested data
  const summary = {};
  const keys = Object.keys(body);
  summary._keys = keys;
  summary._keyCount = keys.length;

  // Include a few key fields if they exist
  const importantFields = ['id', 'status', 'name', 'cs_no', 'device_id', 'error', 'message'];
  importantFields.forEach(field => {
    if (body[field] !== undefined) {
      summary[field] = sanitizeSensitiveFields(body[field]);
    }
  });

  summary._truncated = true;
  return summary;
}

/**
 * Sanitize sensitive fields in an object
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveFields(item));
  }

  const sanitized = { ...obj };
  const sensitiveFields = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'secret',
    'key',
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeSensitiveFields(sanitized[key]);
    }
  });

  return sanitized;
}

module.exports = {
  sanitizeRequestBody,
  sanitizeResponseBody,
  sanitizeSensitiveFields,
};

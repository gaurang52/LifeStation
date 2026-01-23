/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validates user type
 * @param {string} userType - User type to validate
 * @returns {boolean} - True if valid
 */
function isValidUserType(userType) {
  const validTypes = ['ADMIN', 'SUPER_ADMIN', 'caregiver', 'senior'];
  return validTypes.includes(userType);
}

/**
 * Validates device ID type
 * @param {string} idType - ID type to validate
 * @returns {boolean} - True if valid
 */
function isValidIdType(idType) {
  const validTypes = ['imei', 'serial', 'uuid', 'iccid'];
  return validTypes.includes(idType);
}

/**
 * Validates IMEI format (basic)
 * @param {string} imei - IMEI to validate
 * @returns {boolean} - True if valid
 */
function isValidIMEI(imei) {
  const imeiRegex = /^\d{15}$/;
  return imeiRegex.test(imei);
}

/**
 * Sanitizes string input
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validates pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - Normalized pagination params
 */
function validatePagination(page, limit) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

  return {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  };
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidUserType,
  isValidIdType,
  isValidIMEI,
  sanitizeString,
  validatePagination,
};

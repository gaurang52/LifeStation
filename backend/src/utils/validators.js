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
 * Validates display name (letters, spaces, hyphens, apostrophes only; no numbers or special chars)
 * @param {string} name - Name to validate
 * @returns {{ valid: boolean; error?: string }} - Validation result
 */
function isValidDisplayName(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be 100 characters or less' };
  }
  // Allow letters (including Unicode), spaces, hyphens, apostrophes, periods
  const nameRegex = /^[\p{L}\s\-'.]+$/u;
  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }
  return { valid: true };
}

/**
 * Validates password complexity (Affiliated API rules: at least 8 chars, 3 of: uppercase, lowercase, number, special)
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean; error?: string }} - Validation result
 */
function isValidPasswordComplexity(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/\d/.test(password)) count++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) count++;
  if (count < 3) {
    return {
      valid: false,
      error:
        'Password must contain at least three of the following: uppercase letter, lowercase letter, number, special character.',
    };
  }
  return { valid: true };
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
  isValidDisplayName,
  isValidPasswordComplexity,
  sanitizeString,
  validatePagination,
};

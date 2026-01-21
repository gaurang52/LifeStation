const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

// Ensure key is 32 bytes (256 bits)
const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex').slice(0, 32);

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {object} - Encrypted data with iv and authTag
 */
function encrypt(text) {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts encrypted data using AES-256-GCM
 * @param {object|string} encryptedData - Encrypted data object or JSON string
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }

  // Handle both object and JSON string formats
  let data;
  if (typeof encryptedData === 'string') {
    try {
      data = JSON.parse(encryptedData);
    } catch (e) {
      // If parsing fails, assume it's already an object stored as JSONB
      data = encryptedData;
    }
  } else {
    data = encryptedData;
  }

  // Handle JSONB format (PostgreSQL returns objects)
  if (data.encrypted && data.iv && data.authTag) {
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(data.iv, 'hex'));

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  throw new Error('Invalid encrypted data format');
}

/**
 * Encrypts text and returns as JSON string (for database storage)
 * @param {string} text - Text to encrypt
 * @returns {string} - JSON string of encrypted data
 */
function encryptToString(text) {
  return JSON.stringify(encrypt(text));
}

module.exports = {
  encrypt,
  decrypt,
  encryptToString,
};

const logLevel = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[logLevel] || levels.info;

/**
 * Logger utility for consistent logging across the application
 */
const logger = {
  error: (...args) => {
    if (currentLevel >= levels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },

  warn: (...args) => {
    if (currentLevel >= levels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },

  info: (...args) => {
    if (currentLevel >= levels.info) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },

  debug: (...args) => {
    if (currentLevel >= levels.debug) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
};

module.exports = logger;

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

// Initialize Redis connection
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: times => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', err => {
    logger.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });
} else {
  logger.warn('REDIS_URL not set, caching disabled');
}

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    if (!redis) {
      return null;
    }

    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 300) {
    if (!redis) {
      return false;
    }

    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    if (!redis) {
      return false;
    }

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async deletePattern(pattern) {
    if (!redis) {
      return 0;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error('Cache deletePattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(key) {
    if (!redis) {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();

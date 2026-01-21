/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delay - Initial delay in milliseconds (default: 1000)
 * @returns {Promise} - Result of the function
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw error;
      }

      // If this is the last retry, throw the error
      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: delay * 2^i
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Retries a function with custom retry condition
 * @param {Function} fn - Async function to retry
 * @param {Function} shouldRetry - Function that returns true if should retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} - Result of the function
 */
async function retryWithCondition(fn, shouldRetry, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (i === maxRetries - 1) {
        throw error;
      }

      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

module.exports = {
  retry,
  retryWithCondition,
};

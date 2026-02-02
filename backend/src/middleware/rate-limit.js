const rateLimit = require('express-rate-limit');

// General API: higher limit so normal app usage (devices, events, vitals in quick succession) doesn't hit 429
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500;

const externalApiWindowMs = parseInt(process.env.EXTERNAL_API_RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const externalApiMaxRequests = parseInt(process.env.EXTERNAL_API_RATE_LIMIT_MAX_REQUESTS) || 10;

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    });
  },
});

/**
 * Strict rate limiter for external API calls
 */
const externalApiLimiter = rateLimit({
  windowMs: externalApiWindowMs,
  max: externalApiMaxRequests,
  message: 'External API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'External API rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(externalApiWindowMs / 1000),
    });
  },
});

/**
 * Auth rate limiter (stricter for login/register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = {
  apiLimiter,
  externalApiLimiter,
  authLimiter,
};

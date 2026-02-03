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

// Auth: relaxed for QA testing (backend-only change, no app release needed)
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 100; // 100 failed attempts per window

/**
 * Auth rate limiter (login/register)
 */
const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(AUTH_WINDOW_MS / 1000),
    });
  },
});

module.exports = {
  apiLimiter,
  externalApiLimiter,
  authLimiter,
};

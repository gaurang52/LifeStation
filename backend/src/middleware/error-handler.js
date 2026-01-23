const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user_id: req.user_id,
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Invalid Reference',
      message: 'Referenced resource does not exist',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Invalid authentication token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Authentication token has expired',
    });
  }

  // Axios errors (external API errors)
  // Note: External system is an integration service (device/reports provider), not a user management platform
  // All external API calls use service-level credentials from .env
  if (err.response) {
    const status = err.response.status || 500;
    const isClientError = status >= 400 && status < 500;

    // Provide user-friendly error messages without exposing external system details
    return res.status(status).json({
      error: 'Service Unavailable',
      message: isClientError
        ? 'The external service is currently unavailable. Please try again later.'
        : 'An error occurred while communicating with an external service. Please try again later.',
      // Only include status in development for debugging
      ...(process.env.NODE_ENV === 'development' && {
        status: status,
        details: err.response.data?.message || err.message,
      }),
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;

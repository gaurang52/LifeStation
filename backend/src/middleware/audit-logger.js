const auditLogService = require('../services/audit-log.service');

/**
 * Middleware to log API requests for audit purposes
 */
function auditLogger(req, res, next) {
  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function (chunk, encoding) {
    // Log audit entry after response is sent
    setImmediate(async () => {
      try {
        await auditLogService.log({
          user_id: req.user_id || null,
          action: req.route?.path || req.path,
          resource_type: req.body?.resource_type || null,
          resource_id: req.body?.resource_id || req.params?.id || null,
          external_api: null, // Will be set by controllers
          request_method: req.method,
          request_path: req.path,
          response_status: res.statusCode,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
          request_body: sanitizeRequestBody(req.body),
          error_message: res.locals.error_message || null,
        });
      } catch (error) {
        // Don't fail request if audit logging fails
        console.error('Audit logging error:', error);
      }
    });

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

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
  const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

module.exports = auditLogger;

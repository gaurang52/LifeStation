/**
 * Middleware to require specific user roles
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user_type) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user_type)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        current: req.user_type,
      });
    }

    next();
  };
}

module.exports = requireRole;

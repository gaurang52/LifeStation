const jwt = require('jsonwebtoken');
const db = require('../../models');
const logger = require('../../utils/logger');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET_KEY environment variable is required');
}

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Token not provided' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }

  jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      logger.warn('JWT verification failed:', err.message);

      // Try to decode token to get user_id for cleanup
      const decodedToken = jwt.decode(token);
      if (decodedToken?.user_id) {
        try {
          await db.Users.update(
            { is_login: false, fcm_token: null },
            { where: { id: decodedToken.user_id } },
          );
        } catch (updateError) {
          logger.error('Error updating user on token failure:', updateError);
        }
      }

      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Attach user info to request
    req.user_id = decoded.user_id;
    req.user_type = decoded.user_type;
    req.decoded_info = decoded;

    next();
  });
}

module.exports = verifyToken;

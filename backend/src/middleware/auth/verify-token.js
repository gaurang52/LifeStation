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

    req.user_id = decoded.user_id;
    req.decoded_info = decoded;

    // Resolve user_type from DB so role checks (get-seniors, devices, etc.) always use current data.
    // Avoids 403 when JWT lacks user_type (e.g. old tokens) or DB was updated.
    try {
      const user = await db.Users.findByPk(decoded.user_id, {
        attributes: ['id', 'user_type', 'status'],
      });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }
      // Support both instance attribute and dataValues (Sequelize behavior can vary)
      const rawType = user.user_type ?? user.get?.('user_type') ?? user.dataValues?.user_type;
      const fromDb =
        rawType != null && String(rawType).trim() !== '' ? String(rawType).toLowerCase() : null;
      const fromJwt =
        decoded.user_type != null && String(decoded.user_type).trim() !== ''
          ? String(decoded.user_type).toLowerCase()
          : '';
      req.user_type = fromDb ?? fromJwt ?? '';
      if (!req.user_type) {
        logger.warn('verify-token: user_type empty for user', {
          user_id: decoded.user_id,
          fromDb: rawType,
          fromJwt: decoded.user_type,
        });
      }
    } catch (fetchErr) {
      logger.error('Error fetching user in verify-token:', fetchErr);
      const fallback =
        decoded.user_type != null && String(decoded.user_type).trim() !== ''
          ? String(decoded.user_type).toLowerCase()
          : '';
      req.user_type = fallback;
    }

    next();
  });
}

module.exports = verifyToken;

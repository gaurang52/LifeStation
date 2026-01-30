// Middleware to ensure user is authenticated, attach user info to req.user
const jwt = require('jsonwebtoken');
const db = require('../models');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Token not provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const user = await db.Users.findByPk(decoded.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    req.user = { id: user.id, email: user.email, name: user.name, user_type: user.user_type };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = requireAuth;

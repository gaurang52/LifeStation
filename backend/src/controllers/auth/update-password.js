const db = require('../../models');
const bcrypt = require('bcrypt');

/**
 * Update password for authenticated user
 * Body: { current_password, new_password }
 * User must be authenticated and send valid current password.
 */
const updatePassword = async (req, res) => {
  try {
    // Assume user is logged in and user ID is set in req.user from auth middleware
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    const user = await db.Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check old password
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    // Validate new password complexity (example: at least 8 chars)
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    // Update password
    const hash = await bcrypt.hash(new_password, 10);
    user.password = hash;
    await user.save();
    return res.json({ result: 'ok' });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = updatePassword;

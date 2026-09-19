const pool = require('../config/db');

// Helper — magagamit ng ibang controller (hal. complaints) para mag-notify.
async function notifyUser(userId, title, message, type = 'general') {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO Notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, title, message || null, type]
    );
  } catch (e) {
    console.warn('notifyUser skipped:', e.message);
  }
}

// GET /api/notifications  (naka-login) — sariling notifications
async function getMyNotifications(req, res) {
  try {
    const userId = req.user?.userId;
    const [rows] = await pool.query(
      `SELECT notification_id, title, message, type, is_read, created_at
       FROM Notifications WHERE user_id = ? ORDER BY notification_id DESC LIMIT 100`,
      [userId]
    );
    const unread = rows.filter((r) => !r.is_read).length;
    res.json({ list: rows, unread });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications.', error: err.message });
  }
}

// PUT /api/notifications/:id/read
async function markRead(req, res) {
  try {
    const userId = req.user?.userId;
    await pool.query(
      `UPDATE Notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, userId]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification.', error: err.message });
  }
}

// PUT /api/notifications/read-all
async function markAllRead(req, res) {
  try {
    const userId = req.user?.userId;
    await pool.query(`UPDATE Notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
    res.json({ message: 'All marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications.', error: err.message });
  }
}

module.exports = { notifyUser, getMyNotifications, markRead, markAllRead };
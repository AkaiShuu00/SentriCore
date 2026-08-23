const pool = require('./db');

// Call this anywhere to record an action
async function logAction(userId, action, details = null) {
  try {
    await pool.query(
      `INSERT INTO AuditLogs (user_id, action, details) VALUES (?, ?, ?)`,
      [userId || null, action, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAction };
const pool = require('../config/db');

// GET /api/audit  (Admin) - view all audit logs
async function getAuditLogs(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.log_id, a.action, a.details, a.performed_at, u.username
       FROM AuditLogs a
       LEFT JOIN Users u ON u.user_id = a.user_id
       ORDER BY a.log_id DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching audit logs.', error: err.message });
  }
}

module.exports = { getAuditLogs };
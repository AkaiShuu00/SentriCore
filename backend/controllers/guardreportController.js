const pool = require('../config/db');
const { notifyUser } = require('./notificationController');

// POST /api/guard-reports  (Guard) — mag-file ng report (hiwalay sa exit note)
async function createGuardReport(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const { category, reportType, location, description } = req.body;

    const allowed = ['Security Concern', 'Small Problem', 'Incident'];
    if (!category || !allowed.includes(category)) {
      return res.status(400).json({ message: 'Valid category is required.' });
    }
    if (!reportType) {
      return res.status(400).json({ message: 'Type of concern is required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO GuardReports (guard_id, category, report_type, location, description, status)
       VALUES (?, ?, ?, ?, ?, 'Open')`,
      [
        guardId,
        String(category).trim(),
        String(reportType).trim(),
        location ? String(location).trim() : null,
        description ? String(description).trim() : null,
      ]
    );

    // Abisuhan ang lahat ng admin na may bagong report (papasok sa Incident Monitoring)
    try {
      const [admins] = await pool.query(
        `SELECT user_id FROM Users WHERE role_id = 1`
      );
      let guardName = 'A guard';
      if (guardId) {
        const [[g]] = await pool.query(`SELECT full_name FROM Guards WHERE guard_id = ?`, [guardId]);
        if (g) guardName = g.full_name;
      }
      for (const a of admins) {
        await notifyUser(a.user_id, `New Guard Report — ${category}`,
          `${guardName} filed a ${category.toLowerCase()} report (${reportType}).`, 'report');
      }
    } catch (e) { /* ignore notify errors */ }

    res.status(201).json({ message: 'Report submitted.', reportId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting report.', error: err.message });
  }
}

// GET /api/guard-reports/mine  (Guard) — sariling reports
async function getMyGuardReports(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const [rows] = await pool.query(
      `SELECT report_id, category, report_type, location, description, status, created_at
       FROM GuardReports
       WHERE guard_id ${guardId ? '= ?' : 'IS NULL'}
       ORDER BY report_id DESC`,
      guardId ? [guardId] : []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reports.', error: err.message });
  }
}

// GET /api/admin/guard-reports  (Admin) — para sa Incident Monitoring
async function getAdminGuardReports(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT gr.report_id, gr.category, gr.report_type, gr.location, gr.description,
              gr.status, gr.created_at, g.full_name AS guard_name
       FROM GuardReports gr
       LEFT JOIN Guards g ON g.guard_id = gr.guard_id
       ORDER BY gr.report_id DESC`
    );

    const summary = {
      total: rows.length,
      byCategory: {
        'Security Concern': rows.filter((r) => r.category === 'Security Concern').length,
        'Small Problem': rows.filter((r) => r.category === 'Small Problem').length,
        'Incident': rows.filter((r) => r.category === 'Incident').length,
      },
    };

    res.json({ list: rows, summary });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching guard reports.', error: err.message });
  }
}

// PUT /api/admin/guard-reports/:id  (Admin) — mag-acknowledge
async function acknowledgeGuardReport(req, res) {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE GuardReports SET status = 'Acknowledged' WHERE report_id = ?`, [id]);
    res.json({ message: 'Report acknowledged.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating report.', error: err.message });
  }
}

module.exports = { createGuardReport, getMyGuardReports, getAdminGuardReports, acknowledgeGuardReport };
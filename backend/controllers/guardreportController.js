const pool = require('../config/db');
const { notifyUser } = require('./notificationController');

const stamp = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const appendThread = (existing, who, text) => {
  const line = `\n\n[${who} • ${stamp()}]${text ? `\n${text}` : ''}`;
  return `${existing || ''}${line}`.trim();
};

async function notifyAdmins(title, msg) {
  try {
    const [admins] = await pool.query(`SELECT user_id FROM Users WHERE role_id = 1`);
    for (const a of admins) await notifyUser(a.user_id, title, msg, 'report');
  } catch { /* ignore */ }
}
async function getReport(id) {
  const [[r]] = await pool.query(
    `SELECT gr.report_id, gr.guard_id, gr.category, gr.report_type, gr.description, gr.status, g.user_id AS guard_user_id, g.full_name AS guard_name
     FROM GuardReports gr LEFT JOIN Guards g ON g.guard_id = gr.guard_id
     WHERE gr.report_id = ?`, [id]
  );
  return r || null;
}

// POST /api/guard-reports  (Guard)
async function createGuardReport(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const { category, reportType, location, description } = req.body;
    const allowed = ['Security Concern', 'Small Problem', 'Incident'];
    if (!category || !allowed.includes(category)) {
      return res.status(400).json({ message: 'Valid category is required.' });
    }
    if (!reportType) return res.status(400).json({ message: 'Type of concern is required.' });

    let guardName = 'A guard';
    if (guardId) {
      const [[g]] = await pool.query(`SELECT full_name FROM Guards WHERE guard_id = ?`, [guardId]);
      if (g) guardName = g.full_name;
    }
    const thread = appendThread('', `Guard filed (${guardName})`, description ? String(description).trim() : '(no description)');

    const [result] = await pool.query(
      `INSERT INTO GuardReports (guard_id, category, report_type, location, description, status)
       VALUES (?, ?, ?, ?, ?, 'Open')`,
      [guardId, String(category).trim(), String(reportType).trim(),
       location ? String(location).trim() : null, thread]
    );

    await notifyAdmins(`New Guard Report — ${category}`,
      `${guardName} filed a ${category.toLowerCase()} report (${reportType}).`);

    res.status(201).json({ message: 'Report submitted.', reportId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting report.', error: err.message });
  }
}

// GET /api/guard-reports/mine  (Guard)
async function getMyGuardReports(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const [rows] = await pool.query(
      `SELECT report_id, category, report_type, location, description, status, resolved_at, created_at
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

// GET /api/admin/guard-reports  (Admin)
async function getAdminGuardReports(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT gr.report_id, gr.category, gr.report_type, gr.location, gr.description,
              gr.status, gr.resolved_at, gr.created_at, g.full_name AS guard_name
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

// PUT /api/admin/guard-reports/:id  (Admin) — ACKNOWLEDGE (+ optional note), notif sa guard.
async function acknowledgeGuardReport(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const r = await getReport(id);
    if (!r) return res.status(404).json({ message: 'Report not found.' });

    const newDesc = appendThread(r.description, 'Admin acknowledged', note ? String(note).trim() : '(acknowledged)');
    await pool.query(`UPDATE GuardReports SET status = 'Acknowledged', description = ? WHERE report_id = ?`, [newDesc, id]);

    if (r.guard_user_id) {
      await notifyUser(r.guard_user_id, 'Report Acknowledged',
        `Your ${r.category} report (${r.report_type}) was acknowledged by the admin. Mark it Resolved if settled, or re-submit if not.`, 'report');
    }
    res.json({ message: 'Report acknowledged.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating report.', error: err.message });
  }
}

// PUT /api/guard-reports/:id/resolve  (Guard) — GUARD lang ang makaka-mark Resolved.
async function resolveGuardReport(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const { id } = req.params;
    const r = await getReport(id);
    if (!r) return res.status(404).json({ message: 'Report not found.' });
    if (guardId && r.guard_id && Number(r.guard_id) !== Number(guardId)) {
      return res.status(403).json({ message: 'Not your report.' });
    }
    const newDesc = appendThread(r.description, 'Guard', 'Marked as resolved.');
    await pool.query(`UPDATE GuardReports SET status = 'Resolved', resolved_at = NOW(), description = ? WHERE report_id = ?`, [newDesc, id]);
    await notifyAdmins('Guard Report Resolved', `A ${r.category} report (${r.report_type}) was marked Resolved by the guard.`);
    res.json({ message: 'Report marked as resolved.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving report.', error: err.message });
  }
}

// PUT /api/guard-reports/:id/reopen  (Guard) — re-submit → thread, balik Open, notif admin.
async function reopenGuardReport(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const { id } = req.params;
    const { description } = req.body || {};
    const r = await getReport(id);
    if (!r) return res.status(404).json({ message: 'Report not found.' });
    if (guardId && r.guard_id && Number(r.guard_id) !== Number(guardId)) {
      return res.status(403).json({ message: 'Not your report.' });
    }
    const newDesc = appendThread(r.description, 'Guard re-submitted', description ? String(description).trim() : 'Still not resolved.');
    await pool.query(`UPDATE GuardReports SET status = 'Open', resolved_at = NULL, description = ? WHERE report_id = ?`, [newDesc, id]);
    await notifyAdmins('Guard Report Re-submitted', `A ${r.category} report (${r.report_type}) was re-submitted by the guard — still not resolved.`);
    res.json({ message: 'Report re-submitted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error re-submitting report.', error: err.message });
  }
}

// DELETE /api/guard-reports/:id  (Guard) — deletable LANG habang Open (hindi pa na-acknowledge).
async function deleteGuardReport(req, res) {
  try {
    const guardId = req.user?.guardId || null;
    const { id } = req.params;
    const r = await getReport(id);
    if (!r) return res.status(404).json({ message: 'Report not found.' });
    if (guardId && r.guard_id && Number(r.guard_id) !== Number(guardId)) {
      return res.status(403).json({ message: 'Not your report.' });
    }
    if (r.status !== 'Open') {
      return res.status(403).json({ message: 'Cannot delete — the report was already acknowledged by the admin.' });
    }
    await pool.query(`DELETE FROM GuardReports WHERE report_id = ?`, [id]);
    res.json({ message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting report.', error: err.message });
  }
}

module.exports = {
  createGuardReport, getMyGuardReports, getAdminGuardReports, acknowledgeGuardReport,
  resolveGuardReport, reopenGuardReport, deleteGuardReport,
};
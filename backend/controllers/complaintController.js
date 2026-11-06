const pool = require('../config/db');
const { notifyUser } = require('./notificationController');

const stamp = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Idugtong ang bagong mensahe sa THREAD (nasa `description` column).
const appendThread = (existing, who, text) => {
  const line = `\n\n[${who} • ${stamp()}]${text ? `\n${text}` : ''}`;
  return `${existing || ''}${line}`.trim();
};

async function getResidentUserId(residentId) {
  if (!residentId) return null;
  try {
    const [[r]] = await pool.query(`SELECT user_id FROM Residents WHERE resident_id = ?`, [residentId]);
    return r ? r.user_id : null;
  } catch { return null; }
}
async function notifyAdmins(title, msg) {
  try {
    const [admins] = await pool.query(`SELECT user_id FROM Users WHERE role_id = 1`);
    for (const a of admins) await notifyUser(a.user_id, title, msg, 'complaint');
  } catch { /* ignore */ }
}

// POST /api/complaints  (Resident) — mag-file ng reklamo
async function createComplaint(req, res) {
  try {
    const residentId = req.user?.residentId || null;
    const { category, subject, incidentDate, complaintType, description, blocklist } = req.body;
    if (!category || !subject || !complaintType) {
      return res.status(400).json({ message: 'Category, subject, and complaint type are required.' });
    }
    const firstMsg = appendThread('', 'Resident filed', description ? String(description).trim() : '(no description)');
    const [result] = await pool.query(
      `INSERT INTO Complaints
         (resident_id, category, subject, incident_date, complaint_type, description, blocklist, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [residentId, String(category).trim(), String(subject).trim(), incidentDate || null,
       String(complaintType).trim(), firstMsg, blocklist ? 1 : 0]
    );
    await notifyAdmins('New Complaint', `A ${category} complaint about "${subject}" was filed by a resident.`);
    res.status(201).json({ message: 'Complaint submitted.', complaintId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting complaint.', error: err.message });
  }
}

// GET /api/complaints/mine  (Resident)
async function getMyComplaints(req, res) {
  try {
    const residentId = req.user?.residentId || null;
    const [rows] = await pool.query(
      `SELECT complaint_id, category, subject, incident_date, complaint_type, description,
              blocklist, status, resolution, resolved_at, created_at
       FROM Complaints
       WHERE resident_id ${residentId ? '= ?' : 'IS NULL'}
       ORDER BY complaint_id DESC`,
      residentId ? [residentId] : []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching complaints.', error: err.message });
  }
}

// GET /api/admin/complaints  (Admin)
async function getAllComplaints(req, res) {
  try {
    const { category } = req.query;
    const where = [];
    const params = [];
    if (category && category !== 'All') { where.push('c.category = ?'); params.push(category); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT c.complaint_id, c.category, c.subject, c.incident_date, c.complaint_type,
              c.description, c.blocklist, c.status, c.resolution, c.resolved_at, c.created_at,
              res.full_name AS resident_name, res.unit_address
       FROM Complaints c
       LEFT JOIN Residents res ON res.resident_id = c.resident_id
       ${whereSql}
       ORDER BY c.complaint_id DESC`,
      params
    );

    const summary = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Pending').length,
      resolved: rows.filter((r) => r.status === 'Resolved').length,
      byCategory: {
        Visitor: rows.filter((r) => r.category === 'Visitor').length,
        Guard: rows.filter((r) => r.category === 'Guard').length,
        Security: rows.filter((r) => r.category === 'Security').length,
        HOA: rows.filter((r) => r.category === 'HOA').length,
      },
    };
    res.json({ list: rows, summary });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching complaints.', error: err.message });
  }
}

// PUT /api/admin/complaints/:id  (Admin) — ACKNOWLEDGE lang (+ optional allow-blocklist).
// Si resident lang ang makaka-mark ng Resolved.
async function resolveComplaint(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId || null;
    const { resolution, approveBlocklist } = req.body;

    const [rows] = await pool.query(
      `SELECT resident_id, category, subject, complaint_type, blocklist, description FROM Complaints WHERE complaint_id = ?`, [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Complaint not found.' });
    const c = rows[0];

    // I-append ang acknowledgement sa thread + i-store ang resolution text
    const newDesc = appendThread(c.description, 'Admin acknowledged', resolution ? String(resolution).trim() : '(acknowledged)');
    await pool.query(
      `UPDATE Complaints
       SET status = 'Acknowledged', resolution = ?, resolved_by = ?, resolved_at = NULL, description = ?
       WHERE complaint_id = ?`,
      [resolution ? String(resolution).trim() : null, adminId, newDesc, id]
    );

    // Blocklist kung hiniling at in-allow
    let blocklisted = false;
    if (approveBlocklist && c.category === 'Visitor' && c.blocklist) {
      try {
        const [exists] = await pool.query(
          `SELECT block_id FROM Blocklist WHERE resident_id = ? AND person_name = ? LIMIT 1`,
          [c.resident_id, c.subject]
        );
        if (exists.length === 0) {
          await pool.query(
            `INSERT INTO Blocklist (resident_id, person_name, reason, complaint_id) VALUES (?, ?, ?, ?)`,
            [c.resident_id, c.subject, `Complaint: ${c.complaint_type}`, id]
          );
        }
        blocklisted = true;
      } catch (e) { console.warn('Blocklist insert skipped:', e.message); }
    }

    const residentUserId = await getResidentUserId(c.resident_id);
    if (residentUserId) {
      await notifyUser(residentUserId, 'Complaint Acknowledged',
        `Your ${c.category} complaint about "${c.subject}" was acknowledged.${resolution ? ' Action: ' + resolution : ''} Open Complaints to mark it Resolved, or re-submit if not yet settled.`,
        'complaint');
      if (blocklisted) {
        await notifyUser(residentUserId, 'Visitor Blocklisted',
          `"${c.subject}" has been added to your blocklist as requested.`, 'blocklist');
      }
    }
    res.json({ message: 'Complaint acknowledged.', blocklisted });
  } catch (err) {
    res.status(500).json({ message: 'Error updating complaint.', error: err.message });
  }
}

// PUT /api/complaints/:id/resolve  (Resident) — si resident LANG ang makaka-mark ng Resolved.
async function residentResolveComplaint(req, res) {
  try {
    const residentId = req.user?.residentId || null;
    const { id } = req.params;

    const [[existing]] = await pool.query(
      `SELECT description, category, subject FROM Complaints WHERE complaint_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (!existing) return res.status(404).json({ message: 'Complaint not found.' });

    const newDesc = appendThread(existing.description, 'Resident', 'Marked as resolved. ✅');
    const [result] = await pool.query(
      `UPDATE Complaints SET status = 'Resolved', resolved_at = NOW(), description = ?
       WHERE complaint_id = ? AND resident_id = ?`,
      [newDesc, id, residentId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Complaint not found.' });

    // Reflect kay admin: notif na resolved na ni resident
    await notifyAdmins('Complaint Resolved by Resident',
      `A ${existing.category} complaint about "${existing.subject}" was marked Resolved by the resident.`);
    res.json({ message: 'Complaint marked as resolved.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving complaint.', error: err.message });
  }
}

// PUT /api/complaints/:id/reopen  (Resident) — hindi pa ayos → ibalik sa thread + Pending.
async function reopenComplaint(req, res) {
  try {
    const residentId = req.user?.residentId || null;
    const { id } = req.params;
    const { description } = req.body || {};

    const [[existing]] = await pool.query(
      `SELECT description, category, subject FROM Complaints WHERE complaint_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (!existing) return res.status(404).json({ message: 'Complaint not found.' });

    const newDesc = appendThread(existing.description, 'Resident re-submitted',
      description ? String(description).trim() : 'Still not resolved.');
    await pool.query(
      `UPDATE Complaints SET status = 'Pending', resolved_at = NULL, description = ?
       WHERE complaint_id = ? AND resident_id = ?`,
      [newDesc, id, residentId]
    );

    // Notif sa admin (may bagong re-submission) + sa resident mismo (nasa thread na ito)
    await notifyAdmins('Complaint Re-submitted',
      `A ${existing.category} complaint about "${existing.subject}" was re-submitted — still not resolved.`);
    const residentUserId = await getResidentUserId(residentId);
    if (residentUserId) {
      await notifyUser(residentUserId, 'Complaint Re-submitted',
        `Your ${existing.category} complaint about "${existing.subject}" was sent back to the admin. Open the thread to follow up.`,
        'complaint');
    }
    res.json({ message: 'Complaint re-submitted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error re-submitting complaint.', error: err.message });
  }
}

module.exports = {
  createComplaint, getMyComplaints, getAllComplaints, resolveComplaint,
  residentResolveComplaint, reopenComplaint,
};
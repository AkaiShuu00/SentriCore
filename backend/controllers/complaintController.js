const pool = require('../config/db');
const { notifyUser } = require('./notificationController');

// POST /api/complaints  (Resident) — mag-file ng reklamo
async function createComplaint(req, res) {
  try {
    const residentId = req.user?.residentId || null;
    const { category, subject, incidentDate, complaintType, description, blocklist } = req.body;

    if (!category || !subject || !complaintType) {
      return res.status(400).json({ message: 'Category, subject, and complaint type are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO Complaints
         (resident_id, category, subject, incident_date, complaint_type, description, blocklist, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        residentId,
        String(category).trim(),
        String(subject).trim(),
        incidentDate || null,
        String(complaintType).trim(),
        description ? String(description).trim() : null,
        blocklist ? 1 : 0,
      ]
    );
    res.status(201).json({ message: 'Complaint submitted.', complaintId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting complaint.', error: err.message });
  }
}

// GET /api/complaints/mine  (Resident) — sariling reklamo + status/resolution
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

// GET /api/admin/complaints  (Admin) — lahat, may optional ?category= filter
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

    // Summary counts per category + status
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

// PUT /api/admin/complaints/:id  (Admin) — mag-acknowledge/resolve (+ optional allow-blocklist)
async function resolveComplaint(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId || null;
    const { status, resolution, approveBlocklist } = req.body;

    const newStatus = ['Pending', 'Acknowledged', 'Resolved'].includes(status) ? status : 'Acknowledged';
    const resolvedAt = newStatus === 'Resolved' ? new Date() : null;

    // Kunin ang complaint bago i-update (para sa notif + blocklist)
    const [rows] = await pool.query(
      `SELECT resident_id, category, subject, complaint_type, blocklist FROM Complaints WHERE complaint_id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Complaint not found.' });
    const c = rows[0];

    await pool.query(
      `UPDATE Complaints
       SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ?
       WHERE complaint_id = ?`,
      [newStatus, resolution ? String(resolution).trim() : null, adminId, resolvedAt, id]
    );

    // Hanapin ang user_id ng residenteng nag-file
    let residentUserId = null;
    if (c.resident_id) {
      try {
        const [[r]] = await pool.query(`SELECT user_id FROM Residents WHERE resident_id = ?`, [c.resident_id]);
        residentUserId = r ? r.user_id : null;
      } catch (e) { /* ignore */ }
    }

    // Kung Visitor complaint na may blocklist request AT in-allow ng admin → idagdag sa Blocklist
    let blocklisted = false;
    if (approveBlocklist && c.category === 'Visitor' && c.blocklist) {
      try {
        const [exists] = await pool.query(
          `SELECT block_id FROM Blocklist WHERE resident_id = ? AND person_name = ? LIMIT 1`,
          [c.resident_id, c.subject]
        );
        if (exists.length === 0) {
          await pool.query(
            `INSERT INTO Blocklist (resident_id, person_name, reason, complaint_id)
             VALUES (?, ?, ?, ?)`,
            [c.resident_id, c.subject, `Complaint: ${c.complaint_type}`, id]
          );
        }
        blocklisted = true;
      } catch (e) { console.warn('Blocklist insert skipped:', e.message); }
    }

    // Notify ang resident
    if (residentUserId) {
      const msg = newStatus === 'Resolved'
        ? `Your ${c.category} complaint about "${c.subject}" has been resolved.${resolution ? ' ' + resolution : ''}`
        : `Your ${c.category} complaint about "${c.subject}" has been acknowledged by the admin.`;
      await notifyUser(residentUserId, `Complaint ${newStatus}`, msg, 'complaint');
      if (blocklisted) {
        await notifyUser(residentUserId, 'Visitor Blocklisted',
          `"${c.subject}" has been added to your blocklist as requested.`, 'blocklist');
      }
    }

    // Notify din ang guard kung ang complaint ay tungkol sa kanya (Guard category, tugmang pangalan)
    if (c.category === 'Guard') {
      try {
        const [[g]] = await pool.query(`SELECT user_id FROM Guards WHERE full_name = ?`, [c.subject]);
        if (g && g.user_id) {
          await notifyUser(g.user_id, `Complaint ${newStatus}`,
            `A complaint involving you has been ${newStatus.toLowerCase()} by the admin.`, 'complaint');
        }
      } catch (e) { /* ignore */ }
    }

    res.json({ message: 'Complaint updated.', blocklisted });
  } catch (err) {
    res.status(500).json({ message: 'Error updating complaint.', error: err.message });
  }
}

module.exports = { createComplaint, getMyComplaints, getAllComplaints, resolveComplaint };
const pool = require('../config/db');

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

// PUT /api/admin/complaints/:id  (Admin) — mag-acknowledge/resolve
async function resolveComplaint(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId || null;
    const { status, resolution } = req.body;

    const newStatus = ['Pending', 'Acknowledged', 'Resolved'].includes(status) ? status : 'Acknowledged';
    const resolvedAt = newStatus === 'Resolved' ? new Date() : null;

    const [result] = await pool.query(
      `UPDATE Complaints
       SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ?
       WHERE complaint_id = ?`,
      [newStatus, resolution ? String(resolution).trim() : null, adminId, resolvedAt, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Complaint not found.' });
    res.json({ message: 'Complaint updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating complaint.', error: err.message });
  }
}

module.exports = { createComplaint, getMyComplaints, getAllComplaints, resolveComplaint };
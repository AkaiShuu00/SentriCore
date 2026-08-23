const pool = require('../config/db');
const bcrypt = require('bcrypt');

// GET /api/guards  (Admin) - list all guards
async function getGuards(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.guard_id, g.full_name, g.employee_id, g.phone_number, g.email,
              g.shift_start, g.shift_end, g.date_hired, g.status,
              gt.gate_name, u.username, u.user_id
       FROM Guards g
       JOIN Users u ON u.user_id = g.user_id
       LEFT JOIN Gates gt ON gt.gate_id = g.gate_id
       ORDER BY g.guard_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching guards.', error: err.message });
  }
}

// POST /api/guards  (Admin) - create a guard account
async function createGuard(req, res) {
  const conn = await pool.getConnection();
  try {
    const { username, password, fullName, gateId, employeeId, phone, email, shiftStart, shiftEnd, dateHired } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'Username, password, and full name are required.' });
    }

    const [existing] = await conn.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username already taken.' });
    }

    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 10);
    const [u] = await conn.query(
      `INSERT INTO Users (role_id, username, password_hash) VALUES (2, ?, ?)`,
      [username, hash]
    );
    await conn.query(
      `INSERT INTO Guards (user_id, gate_id, full_name, employee_id, phone_number, email, shift_start, shift_end, date_hired)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.insertId, gateId || null, fullName, employeeId || null, phone || null, email || null,
       shiftStart || null, shiftEnd || null, dateHired || null]
    );

    await conn.commit();
    res.status(201).json({ message: 'Guard account created.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error creating guard.', error: err.message });
  } finally {
    conn.release();
  }
}

// PUT /api/guards/:id  (Admin) - update a guard
async function updateGuard(req, res) {
  try {
    const { id } = req.params;
    const { fullName, gateId, employeeId, phone, email, shiftStart, shiftEnd, dateHired } = req.body;

    const [result] = await pool.query(
      `UPDATE Guards SET full_name = ?, gate_id = ?, employee_id = ?, phone_number = ?,
              email = ?, shift_start = ?, shift_end = ?, date_hired = ?
       WHERE guard_id = ?`,
      [fullName, gateId || null, employeeId || null, phone || null, email || null,
       shiftStart || null, shiftEnd || null, dateHired || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Guard not found.' });
    }
    res.json({ message: 'Guard updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating guard.', error: err.message });
  }
}

// GET /api/guards/me  (Guard) - own profile + shift
async function getMyProfile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.guard_id, g.full_name, g.employee_id, g.phone_number, g.email,
              g.shift_start, g.shift_end, g.date_hired, g.status, gt.gate_name, u.username
       FROM Guards g
       JOIN Users u ON u.user_id = g.user_id
       LEFT JOIN Gates gt ON gt.gate_id = g.gate_id
       WHERE g.guard_id = ?`,
      [req.user.guardId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Profile not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile.', error: err.message });
  }
}

// GET /api/guards/on-duty  (Resident/Guard) - list active guards for "Contact Guard"
async function getOnDutyGuards(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.guard_id, g.full_name, g.phone_number, gt.gate_name
       FROM Guards g
       LEFT JOIN Gates gt ON gt.gate_id = g.gate_id
       WHERE g.status = 'Active'
       ORDER BY g.guard_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching guards.', error: err.message });
  }
}

module.exports = { getGuards, createGuard, updateGuard, getMyProfile, getOnDutyGuards };
const pool = require('../config/db');
const bcrypt = require('bcrypt');

function genUsername(fullName) {
  const base = (fullName || 'guard').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'guard';
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// GET /api/admin/guards  (Admin) - list guards
async function listGuards(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.guard_id, g.full_name, g.gate_id, g.shift_schedule, g.status,
              u.username, u.status AS account_status
       FROM Guards g
       LEFT JOIN Users u ON u.user_id = g.user_id
       ORDER BY g.full_name ASC`
    );
    res.json(rows.map((g) => ({
      guardId: g.guard_id,
      fullName: g.full_name,
      gate: g.gate_id ? `Gate ${g.gate_id}` : '—',
      gateId: g.gate_id,
      shift: g.shift_schedule || '—',
      status: g.status || 'Off Duty',
      username: g.username,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching guards.', error: err.message });
  }
}

// GET /api/admin/guards/activity  (Admin) - recent guard actions (entry/exit)
async function guardActivity(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.entry_time, t.exit_time, t.status, t.pass_number,
              res.unit_address,
              ge.full_name AS entry_guard, gx.full_name AS exit_guard
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN Guards ge ON ge.guard_id = t.guard_id
       LEFT JOIN Guards gx ON gx.guard_id = t.exit_guard_id
       ORDER BY t.transaction_id DESC LIMIT 50`
    );
    // Bumuo ng activity rows: entry (at exit kung meron)
    const acts = [];
    for (const t of rows) {
      acts.push({
        guard: t.entry_guard || '—', datetime: t.entry_time,
        visitor: t.visitor_name, unit: t.unit_address, pass: t.pass_number || `P-${t.transaction_id}`, action: 'Entry',
      });
      if (t.exit_time) {
        acts.push({
          guard: t.exit_guard || t.entry_guard || '—', datetime: t.exit_time,
          visitor: t.visitor_name, unit: t.unit_address, pass: t.pass_number || `P-${t.transaction_id}`, action: 'Exit',
        });
      }
    }
    acts.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    res.json(acts.slice(0, 50));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activity.', error: err.message });
  }
}

// POST /api/admin/guards  (Admin) - add guard + auto-generate login
async function addGuard(req, res) {
  const conn = await pool.getConnection();
  try {
    const { fullName, gateId, shift, contact, email } = req.body;
    if (!fullName) return res.status(400).json({ message: 'Full name is required.' });

    let username = genUsername(fullName);
    for (let i = 0; i < 5; i++) {
      const [exists] = await conn.query(`SELECT user_id FROM Users WHERE username = ?`, [username]);
      if (exists.length === 0) break;
      username = genUsername(fullName);
    }
    const tempPassword = genPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await conn.beginTransaction();
    const [[role]] = await conn.query(`SELECT role_id FROM Roles WHERE role_name = 'Guard' LIMIT 1`);
    if (!role) throw new Error("Guard role not found in Roles table.");

    const [u] = await conn.query(
      `INSERT INTO Users (username, password_hash, role_id, status) VALUES (?, ?, ?, 'Active')`,
      [username, hash, role.role_id]
    );

    await conn.query(
      `INSERT INTO Guards (user_id, full_name, gate_id, shift_schedule, status)
       VALUES (?, ?, ?, ?, 'Off Duty')`,
      [u.insertId, fullName.trim(), gateId || null, shift || null]
    );

    await conn.commit();
    res.status(201).json({ message: 'Guard added.', credentials: { username, password: tempPassword } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error adding guard.', error: err.message });
  } finally {
    conn.release();
  }
}

// PUT /api/admin/guards/:id  (Admin) - update guard (incl. gate reassignment)
async function updateGuard(req, res) {
  try {
    const { id } = req.params;
    const { fullName, gateId, shift, status } = req.body;
    const [result] = await pool.query(
      `UPDATE Guards SET full_name = ?, gate_id = ?, shift_schedule = ?, status = ?
       WHERE guard_id = ?`,
      [fullName, gateId || null, shift || null, status || 'Off Duty', id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Guard not found.' });
    res.json({ message: 'Guard updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating guard.', error: err.message });
  }
}

// POST /api/admin/guards/:id/assign  (Admin) - reassign gate (reflects on guard side)
async function assignGate(req, res) {
  try {
    const { id } = req.params;
    const { gateId } = req.body;
    const [result] = await pool.query(
      `UPDATE Guards SET gate_id = ? WHERE guard_id = ?`, [gateId || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Guard not found.' });
    res.json({ message: 'Gate reassigned.' });
  } catch (err) {
    res.status(500).json({ message: 'Error reassigning gate.', error: err.message });
  }
}

// POST /api/admin/guards/:id/reset-password  (Admin)
async function resetGuardPassword(req, res) {
  try {
    const { id } = req.params;
    const [[g]] = await pool.query(`SELECT user_id FROM Guards WHERE guard_id = ?`, [id]);
    if (!g) return res.status(404).json({ message: 'Guard not found.' });
    const newPassword = genPassword();
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET password_hash = ? WHERE user_id = ?`, [hash, g.user_id]);
    res.json({ message: 'Password reset.', password: newPassword });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password.', error: err.message });
  }
}

// DELETE /api/admin/guards/:id  (Admin) - delete guard + account
async function deleteGuard(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const [[g]] = await conn.query(`SELECT user_id FROM Guards WHERE guard_id = ?`, [id]);
    if (!g) return res.status(404).json({ message: 'Guard not found.' });

    await conn.beginTransaction();
    await conn.query(`DELETE FROM Guards WHERE guard_id = ?`, [id]);
    if (g.user_id) await conn.query(`DELETE FROM Users WHERE user_id = ?`, [g.user_id]);
    await conn.commit();
    res.json({ message: 'Guard deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error deleting guard.', error: err.message });
  } finally {
    conn.release();
  }
}

module.exports = {
  listGuards, guardActivity, addGuard, updateGuard, assignGate, resetGuardPassword, deleteGuard,
};
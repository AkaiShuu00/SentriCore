const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Username pattern (kapareho ng resident): name.0001@sentricore
function genUsername(fullName, seq) {
  const base = (fullName || 'guard').toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, '') || 'guard';
  return `${base}.${String(seq).padStart(4, '0')}@sentricore`;
}
// Duty = base LANG sa oras ngayon vs shift window (walang login dependency).
function hmTo24(str) {
  const m = String(str || '').trim().match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10); const mm = m[2] ? parseInt(m[2], 10) : 0; const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && hh !== 12) hh += 12; if (ap === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
}
function computeDuty(shiftSchedule) {
  if (!shiftSchedule) return 'Off Duty';
  const parts = String(shiftSchedule).split(/[-–—]/);
  const s = hmTo24(parts[0]); const e = hmTo24(parts[1]);
  if (s == null || e == null || s === e) return 'Off Duty';
  const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
  const on = s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  return on ? 'On Duty' : 'Off Duty';
}
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// Kunin ang mga column na aktwal na meron ang Guards table (defensive)
async function guardColumns(conn) {
  const [cols] = await (conn || pool).query('SHOW COLUMNS FROM Guards');
  return cols.map((c) => c.Field);
}

// "6:00 AM" → "06:00:00"
function to24h(str) {
  const min = hmTo24(str);
  if (min == null) return null;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;
}
// "6:00 AM - 6:00 PM" → { start:'06:00:00', end:'18:00:00' }
function parseRange(shift) {
  if (!shift) return { start: null, end: null };
  const parts = String(shift).split(/[-–—]/);
  return { start: parts[0] ? to24h(parts[0]) : null, end: parts[1] ? to24h(parts[1]) : null };
}
// Isulat ang shift sa KAHIT ANONG column na meron ang table (schema-agnostic)
function setShiftFields(target, names, shift) {
  if (names.includes('shift_schedule')) target.shift_schedule = shift || null;
  else if (names.includes('schedule')) target.schedule = shift || null;
  if (names.includes('shift_start') || names.includes('shift_end')) {
    const { start, end } = parseRange(shift);
    if (names.includes('shift_start')) target.shift_start = start;
    if (names.includes('shift_end')) target.shift_end = end;
  }
}

// GET /api/admin/guards  (Admin) - list guards (kasama contact/email/photo kung meron)
async function listGuards(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.username, u.status AS account_status
       FROM Guards g
       LEFT JOIN Users u ON u.user_id = g.user_id
       ORDER BY g.full_name ASC`
    );
    res.json(rows.map((g) => {
      const shiftStr = g.shift_schedule || g.schedule
        || ((g.shift_start && g.shift_end) ? `${String(g.shift_start).slice(0, 5)} - ${String(g.shift_end).slice(0, 5)}` : '');
      return {
        guardId: g.guard_id,
        fullName: g.full_name,
        gate: g.gate_id ? `Gate ${g.gate_id}` : '—',
        gateId: g.gate_id,
        shift: shiftStr || '—',
        // AUTOMATIC — base sa oras ngayon vs shift window (kung kailangan man ipakita)
        status: computeDuty(shiftStr),
        username: g.username,
        contact: g.phone_number || '',
        employeeId: g.employee_id || '',
        photo: g.photo || null,
      };
    }));
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
    const { fullName, gateId, shift, contact, photo } = req.body;
    if (!fullName) return res.status(400).json({ message: 'Full name is required.' });

    // Username: name.NNNN@sentricore (NNNN = order ng guard, unique-checked)
    const [[cnt]] = await conn.query(`SELECT COUNT(*) AS n FROM Guards`);
    let seq = (cnt.n || 0) + 1;
    let username = genUsername(fullName, seq);
    for (let i = 0; i < 30; i++) {
      const [exists] = await conn.query(`SELECT user_id FROM Users WHERE username = ?`, [username]);
      if (exists.length === 0) break;
      seq++; username = genUsername(fullName, seq);
    }
    const tempPassword = genPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await conn.beginTransaction();
    const [[role]] = await conn.query(`SELECT role_id FROM Roles WHERE role_name = 'Guard' LIMIT 1`);
    if (!role) throw new Error('Guard role not found in Roles table.');

    const [u] = await conn.query(
      `INSERT INTO Users (username, password_hash, role_id, status) VALUES (?, ?, ?, 'Active')`,
      [username, hash, role.role_id]
    );

    // Defensive insert — ilalagay lang ang mga column na aktwal na meron
    const names = await guardColumns(conn);
    const fields = { user_id: u.insertId, full_name: fullName.trim(), gate_id: gateId || null, status: 'Off Duty' };
    setShiftFields(fields, names, shift);
    if (names.includes('phone_number')) fields.phone_number = contact || null;
    if (names.includes('photo')) fields.photo = photo || null;
    const keys = Object.keys(fields);
    await conn.query(
      `INSERT INTO Guards (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map((k) => fields[k])
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

// PUT /api/admin/guards/:id  (Admin) - update guard (defensive sa columns)
async function updateGuard(req, res) {
  try {
    const { id } = req.params;
    const { fullName, gateId, shift, contact, photo } = req.body;
    const names = await guardColumns();

    const set = {};
    if (fullName !== undefined) set.full_name = fullName;
    set.gate_id = gateId || null;
    if (shift !== undefined) setShiftFields(set, names, shift);
    if (names.includes('phone_number') && contact !== undefined) set.phone_number = contact || null;
    if (names.includes('photo') && photo !== undefined) set.photo = photo || null;

    const keys = Object.keys(set);
    const [result] = await pool.query(
      `UPDATE Guards SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE guard_id = ?`,
      [...keys.map((k) => set[k]), id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Guard not found.' });
    res.json({ message: 'Guard updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating guard.', error: err.message });
  }
}

// POST /api/admin/guards/:id/assign  (Admin) - reassign gate
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
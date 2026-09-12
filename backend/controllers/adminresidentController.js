const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Helper: generate username + temp password
function genUsername(fullName) {
  const base = (fullName || 'resident').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'resident';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${base}${rand}`;
}
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// GET /api/admin/residents  (Admin) - list w/ active + monthly visitor counts
async function listResidents(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.resident_id, r.full_name, r.unit_address, r.phone_number, r.email,
              u.username, u.status
       FROM Residents r
       LEFT JOIN Users u ON u.user_id = r.user_id
       ORDER BY r.full_name ASC`
    );

    // Active visitors + this-month total per resident
    const result = [];
    for (const r of rows) {
      const [[active]] = await pool.query(
        `SELECT COUNT(*) AS n FROM VisitorTransactions WHERE resident_id = ? AND status = 'Active'`,
        [r.resident_id]
      );
      const [[month]] = await pool.query(
        `SELECT COUNT(*) AS n FROM VisitorTransactions
         WHERE resident_id = ?
           AND entry_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           AND entry_time <  DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH`,
        [r.resident_id]
      );
      result.push({
        residentId: r.resident_id,
        fullName: r.full_name,
        address: r.unit_address,
        contact: r.phone_number,
        email: r.email,
        username: r.username,
        status: r.status,
        activeVisitors: active.n,
        monthlyVisitors: month.n,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching residents.', error: err.message });
  }
}

// GET /api/admin/residents/:id/active  (Admin) - active visitors of a resident
async function residentActiveVisitors(req, res) {
  try {
    const { id } = req.params;
    const [[r]] = await pool.query(`SELECT full_name, unit_address FROM Residents WHERE resident_id = ?`, [id]);
    const [visitors] = await pool.query(
      `SELECT visitor_name, entry_time, plate_number
       FROM VisitorTransactions
       WHERE resident_id = ? AND status = 'Active'
       ORDER BY transaction_id DESC`,
      [id]
    );
    res.json({
      resident: r ? r.full_name : '',
      unit: r ? r.unit_address : '',
      activeCount: visitors.length,
      visitors: visitors.map((v) => ({
        name: v.visitor_name,
        entry: v.entry_time,
        mode: v.plate_number ? 'Private Vehicle' : 'Walk-in',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching active visitors.', error: err.message });
  }
}

// POST /api/admin/residents  (Admin) - add resident + auto-generate login
async function addResident(req, res) {
  const conn = await pool.getConnection();
  try {
    const { fullName, address, contact, email } = req.body;
    if (!fullName || !address) {
      return res.status(400).json({ message: 'Full name and address are required.' });
    }

    // Generate unique username
    let username = genUsername(fullName);
    for (let tries = 0; tries < 5; tries++) {
      const [exists] = await conn.query(`SELECT user_id FROM Users WHERE username = ?`, [username]);
      if (exists.length === 0) break;
      username = genUsername(fullName);
    }
    const tempPassword = genPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await conn.beginTransaction();

    // Get Resident role_id
    const [[role]] = await conn.query(`SELECT role_id FROM Roles WHERE role_name = 'Resident' LIMIT 1`);
    if (!role) throw new Error("Resident role not found in Roles table.");

    // Create user
    const [u] = await conn.query(
      `INSERT INTO Users (username, password_hash, role_id, status) VALUES (?, ?, ?, 'Active')`,
      [username, hash, role.role_id]
    );
    const userId = u.insertId;

    // Create resident
    await conn.query(
      `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, fullName.trim(), address.trim(), contact || null, email || null]
    );

    await conn.commit();
    // Ibalik ang generated credentials (isang beses lang makikita)
    res.status(201).json({
      message: 'Resident added.',
      credentials: { username, password: tempPassword },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error adding resident.', error: err.message });
  } finally {
    conn.release();
  }
}

// PUT /api/admin/residents/:id  (Admin) - update resident details (keeps records)
async function updateResident(req, res) {
  try {
    const { id } = req.params;
    const { fullName, address, contact, email } = req.body;
    const [result] = await pool.query(
      `UPDATE Residents SET full_name = ?, unit_address = ?, phone_number = ?, email = ?
       WHERE resident_id = ?`,
      [fullName, address, contact || null, email || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Resident not found.' });
    res.json({ message: 'Resident updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating resident.', error: err.message });
  }
}

// POST /api/admin/residents/:id/reset-password  (Admin) - reset password (records intact)
async function resetResidentPassword(req, res) {
  try {
    const { id } = req.params;
    const [[r]] = await pool.query(`SELECT user_id FROM Residents WHERE resident_id = ?`, [id]);
    if (!r) return res.status(404).json({ message: 'Resident not found.' });

    const newPassword = genPassword();
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET password_hash = ? WHERE user_id = ?`, [hash, r.user_id]);

    res.json({ message: 'Password reset.', password: newPassword });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password.', error: err.message });
  }
}

module.exports = {
  listResidents, residentActiveVisitors, addResident, updateResident, resetResidentPassword,
};
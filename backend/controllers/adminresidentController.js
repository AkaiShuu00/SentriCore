const pool = require('../config/db');
const bcrypt = require('bcrypt');
// ⬇️ CHANGE: i-import ang field-level encryption (ilagay ang crypto.js sa config/ — katabi ng db.js/mailer.js)
const { encrypt, decrypt } = require('../config/crypto');
// ⬇️ CHANGE: account welcome email (username + temp password)
const { sendAccountEmail } = require('../config/mailer');

// Helper: username slug mula sa unang pangalan (letters lang)
function nameSlug(fullName) {
  const first = String(fullName || 'resident').trim().split(/\s+/)[0] || 'resident';
  return first.toLowerCase().replace(/[^a-z]/g, '') || 'resident';
}
// Pattern: name.NNNN@sentricore
async function makeResidentUsername(conn, fullName) {
  const slug = nameSlug(fullName);
  const [[c]] = await conn.query('SELECT COUNT(*) AS n FROM Residents');
  let seq = (c.n || 0) + 1;
  for (let i = 0; i < 1000; i++) {
    const username = `${slug}.${String(seq).padStart(4, '0')}@sentricore`;
    const [exists] = await conn.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    if (exists.length === 0) return username;
    seq++;
  }
  return `${slug}.${Date.now()}@sentricore`;
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
        // ⬇️ CHANGE: i-decrypt bago ibalik sa frontend (plaintext rows ay babasahin pa rin)
        contact: decrypt(r.phone_number),
        email: decrypt(r.email),
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

    await conn.beginTransaction();

    const username = await makeResidentUsername(conn, fullName);
    const tempPassword = genPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const [[role]] = await conn.query(`SELECT role_id FROM Roles WHERE role_name = 'Resident' LIMIT 1`);
    if (!role) throw new Error("Resident role not found in Roles table.");

    const [u] = await conn.query(
      `INSERT INTO Users (username, password_hash, role_id, status) VALUES (?, ?, ?, 'Active')`,
      [username, hash, role.role_id]
    );
    const userId = u.insertId;

    // ⬇️ CHANGE: i-encrypt ang phone_number + email bago isave
    await conn.query(
      `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, fullName.trim(), address.trim(), encrypt(contact || null), encrypt(email || null)]
    );

    await conn.commit();

    // ⬇️ CHANGE: email ang account details sa resident (kung may email). Hindi
    // pinipigilan ang pag-create kung mabigo ang email — naka-try/catch lang.
    if (email) {
      try {
        await sendAccountEmail(email.trim(), username, tempPassword, fullName.trim());
        console.log('[ACCOUNT] Welcome email sent to', email.trim());
      } catch (mailErr) {
        console.error('[ACCOUNT] Welcome email FAILED:', mailErr.message);
      }
    }

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
    // ⬇️ CHANGE: i-encrypt ang phone_number + email bago i-update
    const [result] = await pool.query(
      `UPDATE Residents SET full_name = ?, unit_address = ?, phone_number = ?, email = ?
       WHERE resident_id = ?`,
      [fullName, address, encrypt(contact || null), encrypt(email || null), id]
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
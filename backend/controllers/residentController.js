const pool = require('../config/db');
const bcrypt = require('bcrypt');
// ⬇️ CHANGE: field-level encryption (crypto.js nasa config/ — katabi ng db.js/mailer.js)
const { encrypt, decrypt } = require('../config/crypto');
// ⬇️ CHANGE: account welcome email (username + password)
const { sendAccountEmail } = require('../config/mailer');

// GET /api/residents  (Admin) - list all residents
async function getResidents(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.resident_id, r.full_name, r.unit_address, r.phone_number, r.email,
              u.username, u.status, u.user_id
       FROM Residents r
       JOIN Users u ON u.user_id = r.user_id
       ORDER BY r.resident_id`
    );
    // ⬇️ CHANGE: i-decrypt ang phone_number + email bago ibalik (plaintext rows ay babasahin pa rin)
    const out = rows.map((r) => ({
      ...r,
      phone_number: decrypt(r.phone_number),
      email: decrypt(r.email),
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching residents.', error: err.message });
  }
}

// POST /api/residents  (Admin) - create a resident account
async function createResident(req, res) {
  const conn = await pool.getConnection();
  try {
    const { username, password, fullName, address, phone, email } = req.body;

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
      `INSERT INTO Users (role_id, username, password_hash) VALUES (3, ?, ?)`,
      [username, hash]
    );
    // ⬇️ CHANGE: i-encrypt ang phone_number + email bago isave
    await conn.query(
      `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email)
       VALUES (?, ?, ?, ?, ?)`,
      [u.insertId, fullName, address || null, encrypt(phone || null), encrypt(email || null)]
    );

    await conn.commit();

    // ⬇️ CHANGE: email ang account details sa resident (kung may email).
    // Ginagamit ang plaintext `password` na galing sa request (bago ma-hash) —
    // hindi galing DB. Naka-try/catch para hindi masira ang create kung mag-fail email.
    if (email) {
      try {
        await sendAccountEmail(String(email).trim(), username, password, fullName);
        console.log('[ACCOUNT] Welcome email sent to', String(email).trim());
      } catch (mailErr) {
        console.error('[ACCOUNT] Welcome email FAILED:', mailErr.message);
      }
    }

    res.status(201).json({ message: 'Resident account created.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error creating resident.', error: err.message });
  } finally {
    conn.release();
  }
}

// PUT /api/residents/:id  (Admin) - update a resident
async function updateResident(req, res) {
  try {
    const { id } = req.params;
    const { fullName, address, phone, email } = req.body;

    // ⬇️ CHANGE: i-encrypt ang phone_number + email bago i-update
    const [result] = await pool.query(
      `UPDATE Residents SET full_name = ?, unit_address = ?, phone_number = ?, email = ?
       WHERE resident_id = ?`,
      [fullName, address || null, encrypt(phone || null), encrypt(email || null), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resident not found.' });
    }
    res.json({ message: 'Resident updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating resident.', error: err.message });
  }
}

// DELETE /api/residents/:id  (Admin) - deactivate a resident
async function deactivateResident(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT user_id FROM Residents WHERE resident_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Resident not found.' });
    }
    await pool.query(`UPDATE Users SET status = 'Inactive' WHERE user_id = ?`, [rows[0].user_id]);
    res.json({ message: 'Resident account deactivated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deactivating resident.', error: err.message });
  }
}

// GET /api/residents/me  (Resident) - own profile
async function getMyProfile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.resident_id, r.full_name, r.unit_address, r.phone_number, r.email, u.username
       FROM Residents r JOIN Users u ON u.user_id = r.user_id
       WHERE r.resident_id = ?`,
      [req.user.residentId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Profile not found.' });
    // ⬇️ CHANGE: i-decrypt bago ibalik sa resident
    const me = { ...rows[0], phone_number: decrypt(rows[0].phone_number), email: decrypt(rows[0].email) };
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile.', error: err.message });
  }
}

module.exports = { getResidents, createResident, updateResident, deactivateResident, getMyProfile };
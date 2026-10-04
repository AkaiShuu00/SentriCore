const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Admin details ay HINDI naka-encrypt (per design: readable para sa pamamahala).
function validatePhone(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return { ok: true, value: null };
  const v = String(raw).replace(/[\s()\-]/g, '');
  if (/^(09\d{9}|\+639\d{9})$/.test(v) || /^(\+?63)?0?\d{7,10}$/.test(v)) return { ok: true, value: v };
  return { ok: false, value: v };
}

// Siguraduhing may Admins row ang kasalukuyang admin (auto-create kung wala pa).
async function ensureAdminRow(userId) {
  const [[a]] = await pool.query('SELECT * FROM Admins WHERE user_id = ?', [userId]);
  if (a) return a;
  const [[u]] = await pool.query('SELECT username FROM Users WHERE user_id = ?', [userId]);
  await pool.query('INSERT INTO Admins (user_id, display_name) VALUES (?, ?)', [userId, u ? u.username : 'Admin']);
  const [[a2]] = await pool.query('SELECT * FROM Admins WHERE user_id = ?', [userId]);
  return a2;
}

// GET /api/admin/me  (Admin) - sariling profile
async function getMyAdminProfile(req, res) {
  try {
    const userId = req.user.userId;
    const a = await ensureAdminRow(userId);
    const [[u]] = await pool.query('SELECT username FROM Users WHERE user_id = ?', [userId]);
    res.json({
      displayName: a.display_name || (u ? u.username : 'Admin'),
      phoneNumber: a.phone_number || '',
      email: a.email || '',
      username: u ? u.username : '',
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin profile.', error: err.message });
  }
}

// PUT /api/admin/me  (Admin) - i-update ang display name, phone, email, (optional) password
async function updateMyAdminProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { displayName, phoneNumber, email, currentPassword, newPassword } = req.body;

    const ph = validatePhone(phoneNumber);
    if (!ph.ok) return res.status(400).json({ message: 'Invalid phone number. Use a valid PH mobile (09XXXXXXXXX) or landline.' });

    await ensureAdminRow(userId);
    await pool.query(
      'UPDATE Admins SET display_name = ?, phone_number = ?, email = ? WHERE user_id = ?',
      [displayName || null, ph.value, email || null, userId]
    );

    // Opsyonal: palitan ang password (kailangan ang tamang kasalukuyang password)
    if (newPassword) {
      if (String(newPassword).length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });
      const [[u]] = await pool.query('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
      if (!u) return res.status(404).json({ message: 'User not found.' });
      const ok = await bcrypt.compare(currentPassword || '', u.password_hash);
      if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' });
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
    }

    res.json({ message: 'Admin profile updated.', displayName: displayName || null });
  } catch (err) {
    res.status(500).json({ message: 'Error updating admin profile.', error: err.message });
  }
}

// GET /api/admin/contact  (any logged-in: ginagamit ng guard para tawagan ang HOA)
async function getAdminContact(req, res) {
  try {
    // Unahin ang admin na may phone; kung wala, kahit sinong admin.
    let [[a]] = await pool.query(
      `SELECT display_name, phone_number FROM Admins
       WHERE phone_number IS NOT NULL AND phone_number <> '' ORDER BY admin_id LIMIT 1`
    );
    if (!a) {
      [[a]] = await pool.query(`SELECT display_name, phone_number FROM Admins ORDER BY admin_id LIMIT 1`);
    }
    res.json({
      name: a ? (a.display_name || 'HOA Administrator') : 'HOA Administrator',
      phone: a ? (a.phone_number || '') : '',
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin contact.', error: err.message });
  }
}

module.exports = { getMyAdminProfile, updateMyAdminProfile, getAdminContact };
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logAction } = require('../config/audit');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.password_hash, u.status, r.role_name
       FROM Users u
       JOIN Roles r ON r.role_id = u.role_id
       WHERE u.username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'This account is inactive.' });
    }

    if (user.role_name !== role) {
      return res.status(403).json({ message: `No ${role.toLowerCase()} account found for these credentials.` });
    }

    let profile = { userId: user.user_id, role: user.role_name, username: user.username };

    if (user.role_name === 'Resident') {
      const [r] = await pool.query('SELECT resident_id, full_name FROM Residents WHERE user_id = ?', [user.user_id]);
      if (r.length) { profile.residentId = r[0].resident_id; profile.name = r[0].full_name; }
    } else if (user.role_name === 'Guard') {
      const [g] = await pool.query('SELECT guard_id, gate_id, full_name FROM Guards WHERE user_id = ?', [user.user_id]);
      if (g.length) { profile.guardId = g[0].guard_id; profile.gateId = g[0].gate_id; profile.name = g[0].full_name; }
    } else if (user.role_name === 'Admin') {
      profile.name = user.username;
    }

    const token = jwt.sign(profile, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    await logAction(user.user_id, 'Login', `${user.role_name} "${user.username}" logged in.`);

    res.json({ message: 'Login successful.', token, user: profile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
}

module.exports = { login };
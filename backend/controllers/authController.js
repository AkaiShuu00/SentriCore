const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logAction } = require('../config/audit');
const { sendMail } = require('../config/mailer');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.password_hash, u.status, r.role_name
       FROM Users u
       JOIN Roles r ON r.role_id = u.role_id
       WHERE u.username = ?`,
      [username]
    );
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid username or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid username or password.' });
    if (user.status !== 'Active') return res.status(403).json({ message: 'This account is inactive.' });

    let profile = { userId: user.user_id, role: user.role_name, username: user.username };
    if (user.role_name === 'Resident') {
      const [r] = await pool.query('SELECT resident_id, full_name FROM Residents WHERE user_id = ?', [user.user_id]);
      if (r.length) { profile.residentId = r[0].resident_id; profile.name = r[0].full_name; }
    } else if (user.role_name === 'Guard') {
      const [g] = await pool.query('SELECT * FROM Guards WHERE user_id = ?', [user.user_id]);
      if (g.length) {
        profile.guardId = g[0].guard_id; profile.gateId = g[0].gate_id; profile.name = g[0].full_name;
        // ── AUTO TIME-IN sa login (kung walang bukas na shift pa) ──
        // Kung nag-login nang mas maaga sa naka-schedule na shift start, ang time-in ay
        // itatakda sa shift start (hindi binibilang ang maagang login). Kung after na, ngayon.
        try {
          const [open] = await pool.query(
            `SELECT shift_id FROM GuardShifts WHERE guard_id = ? AND time_out IS NULL ORDER BY shift_id DESC LIMIT 1`,
            [g[0].guard_id]
          );
          if (!open.length) {
            let timeIn = new Date();
            // Kunin ang shift start: mula shift_start column, o i-parse ang shift_schedule string.
            let ss = g[0].shift_start || null;
            if (!ss && g[0].shift_schedule) {
              const m = String(g[0].shift_schedule).split(/[-–—]/)[0].trim().match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
              if (m) {
                let hh = parseInt(m[1], 10); const mm = m[2] ? parseInt(m[2], 10) : 0; const ap = (m[3] || '').toUpperCase();
                if (ap === 'PM' && hh !== 12) hh += 12; if (ap === 'AM' && hh === 12) hh = 0;
                ss = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
              }
            }
            if (ss) {
              const [hh, mm] = String(ss).split(':').map(Number);
              const sched = new Date();
              sched.setHours(hh || 0, mm || 0, 0, 0);
              if (timeIn < sched) timeIn = sched; // maagang login → time-in = shift start
            }
            await pool.query(`INSERT INTO GuardShifts (guard_id, time_in) VALUES (?, ?)`, [g[0].guard_id, timeIn]);
          }
        } catch (shiftErr) { console.warn('Time-in skipped:', shiftErr.message); }
      }
    } else if (user.role_name === 'Admin') {
      profile.name = user.username;
    }

    // WALANG expiry — hindi mag-eexpire ang token (ligtas para sa live demo/defense).
    const token = jwt.sign(profile, process.env.JWT_SECRET);
    await logAction(user.user_id, 'Login', `${user.role_name} "${user.username}" logged in.`);
    res.json({ message: 'Login successful.', token, user: profile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
}

// POST /api/auth/forgot  (public) — magpadala ng verification code sa registered email
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const [rows] = await pool.query(
      `SELECT u.user_id, u.username
       FROM Users u JOIN Residents r ON r.user_id = u.user_id
       WHERE r.email = ? LIMIT 1`,
      [email.trim()]
    );

    // Laging success-looking response (iwas email enumeration)
    if (rows.length) {
      const user = rows[0];
      const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
      const codeHash = await bcrypt.hash(code, 10);
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await pool.query(
        `INSERT INTO PasswordResets (user_id, code_hash, expires_at) VALUES (?, ?, ?)`,
        [user.user_id, codeHash, expires]
      );
      // DEV/DEMO: laging ipakita ang code sa backend terminal para makapag-test kahit
      // hindi pa gumagana ang email. (Alisin/i-comment kapag production na.)
      console.log(`\n[FORGOT] Verification code for ${email.trim()}: ${code}\n`);
      try {
        const sent = await sendMail(
          email.trim(),
          'SentriCore Verification Code',
          `Your SentriCore verification code is:\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, please ignore.`
        );
        console.log('[FORGOT] Email sent?', sent);
      } catch (mailErr) {
        console.error('[FORGOT] Email send FAILED:', mailErr.message);
      }
    } else {
      console.log(`[FORGOT] Walang resident na may email: ${email.trim()}`);
    }

    res.json({ message: 'If the email is registered, a verification code has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing request.', error: err.message });
  }
}

// POST /api/auth/reset  (public) — email + code + newPassword
async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.query(
      `SELECT pr.id, pr.code_hash, pr.user_id
       FROM PasswordResets pr
       JOIN Users u ON u.user_id = pr.user_id
       JOIN Residents r ON r.user_id = u.user_id
       WHERE r.email = ? AND pr.used = 0 AND pr.expires_at > NOW()
       ORDER BY pr.id DESC LIMIT 1`,
      [email.trim()]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired code.' });

    const pr = rows[0];
    const ok = await bcrypt.compare(String(code).trim(), pr.code_hash);
    if (!ok) return res.status(400).json({ message: 'Incorrect verification code.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET password_hash = ? WHERE user_id = ?`, [hash, pr.user_id]);
    await pool.query(`UPDATE PasswordResets SET used = 1 WHERE id = ?`, [pr.id]);

    res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password.', error: err.message });
  }
}

// POST /api/auth/change-password  (auth) — alam ang lumang password
async function changePassword(req, res) {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }
    const [[u]] = await pool.query(`SELECT password_hash FROM Users WHERE user_id = ?`, [userId]);
    if (!u) return res.status(404).json({ message: 'User not found.' });

    const ok = await bcrypt.compare(currentPassword, u.password_hash);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET password_hash = ? WHERE user_id = ?`, [hash, userId]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error changing password.', error: err.message });
  }
}

module.exports = { login, forgotPassword, resetPassword, changePassword };
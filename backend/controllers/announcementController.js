const pool = require('../config/db');

// GET /api/announcements  (All logged-in) - list, latest first
// - Audience: ang naka-login lang na role ang tumatanggap (Residents/Guards/All).
// - Expiry: nawawala pagdating/lampas ng end_date; hindi pa lumalabas bago ang start_date.
// - Admin: nakikita ang LAHAT (kasama expired) para ma-manage.
async function getAnnouncements(req, res) {
  try {
    const role = req.user?.role || '';

    // Alamin kung anong columns ang meron (defensive — baka lumang DB pa)
    const [cols] = await pool.query(`SHOW COLUMNS FROM Announcements`);
    const colNames = cols.map((c) => c.Field);
    const has = (c) => colNames.includes(c);

    const where = [];
    const params = [];

    if (role !== 'Admin') {
      // Active window (kung may date columns)
      if (has('start_date')) where.push(`(start_date IS NULL OR start_date <= CURDATE())`);
      if (has('end_date'))   where.push(`(end_date IS NULL OR end_date >= CURDATE())`);

      // Audience (kung may recipients column)
      if (has('recipients')) {
        const aud = role === 'Guard' ? 'Guards' : (role === 'Resident' ? 'Residents' : null);
        where.push(
          `(recipients IS NULL OR recipients = '' OR recipients IN ('All','Everyone','Both')
            OR FIND_IN_SET(?, REPLACE(recipients, ' ', '')))`
        );
        params.push(aud);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM Announcements ${whereSql} ORDER BY announcement_id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching announcements.', error: err.message });
  }
}

// POST /api/announcements  (Admin) - create
// Flexible: i-insert lang ang mga column na TALAGANG umiiral sa table.
async function createAnnouncement(req, res) {
  try {
    const { title, content, category, priority, recipients, startDate, endDate } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    // Alamin kung anong columns ang meron ang Announcements table
    const [cols] = await pool.query(`SHOW COLUMNS FROM Announcements`);
    const colNames = cols.map((c) => c.Field);

    // Posibleng values, imapa sa posibleng column names
    const candidates = {
      title: title.trim(),
      content: content.trim(),
      category: category || null,
      priority: priority || null,
      recipients: recipients || null,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    // Piliin lang ang columns na existing
    const insertCols = [];
    const placeholders = [];
    const values = [];
    for (const [col, val] of Object.entries(candidates)) {
      if (colNames.includes(col)) {
        insertCols.push(col);
        placeholders.push('?');
        values.push(val);
      }
    }

    const [result] = await pool.query(
      `INSERT INTO Announcements (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
    res.status(201).json({ message: 'Announcement posted.', announcementId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating announcement.', error: err.message });
  }
}

// PUT /api/announcements/:id  (Admin) - edit
async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }
    const [result] = await pool.query(
      `UPDATE Announcements SET title = ?, content = ? WHERE announcement_id = ?`,
      [title.trim(), content.trim(), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    res.json({ message: 'Announcement updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating announcement.', error: err.message });
  }
}

// DELETE /api/announcements/:id  (Admin) - delete
async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `DELETE FROM Announcements WHERE announcement_id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting announcement.', error: err.message });
  }
}

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
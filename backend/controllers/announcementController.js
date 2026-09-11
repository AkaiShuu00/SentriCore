const pool = require('../config/db');

// GET /api/announcements  (All logged-in) - list, latest first
async function getAnnouncements(req, res) {
  try {
    // SELECT * para makuha ang lahat ng column na meron (title, content, category, priority, dates, atbp.)
    const [rows] = await pool.query(
      `SELECT * FROM Announcements ORDER BY announcement_id DESC`
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
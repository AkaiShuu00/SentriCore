const pool = require('../config/db');

// GET /api/announcements  (All logged-in) - list, latest first
async function getAnnouncements(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT announcement_id, title, content, created_at
       FROM Announcements
       ORDER BY announcement_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching announcements.', error: err.message });
  }
}

// POST /api/announcements  (Admin) - create
async function createAnnouncement(req, res) {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO Announcements (title, content) VALUES (?, ?)`,
      [title.trim(), content.trim()]
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
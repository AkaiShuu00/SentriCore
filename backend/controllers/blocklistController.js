const pool = require('../config/db');

// POST /api/blocklist  (Resident) - add a person to block
async function addToBlocklist(req, res) {
  try {
    const residentId = req.user.residentId;
    const { personName, reason } = req.body;

    if (!personName || !reason) {
      return res.status(400).json({ message: 'Person name and reason are required.' });
    }

    await pool.query(
      `INSERT INTO BlockList (resident_id, person_name, reason) VALUES (?, ?, ?)`,
      [residentId, personName.trim(), reason.trim()]
    );

    res.status(201).json({ message: 'Person added to block list.' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding to block list.', error: err.message });
  }
}

// GET /api/blocklist  (Resident) - own block list
async function getMyBlocklist(req, res) {
  try {
    const residentId = req.user.residentId;
    const [rows] = await pool.query(
      `SELECT block_id, person_name, reason, added_at
       FROM BlockList WHERE resident_id = ?
       ORDER BY block_id DESC`,
      [residentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching block list.', error: err.message });
  }
}

// DELETE /api/blocklist/:id  (Resident) - remove from block list
async function removeFromBlocklist(req, res) {
  try {
    const residentId = req.user.residentId;
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM BlockList WHERE block_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Block list entry not found.' });
    }
    res.json({ message: 'Removed from block list.' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing from block list.', error: err.message });
  }
}

// GET /api/blocklist/check?name=  (Guard) - check if a visitor is blocked
async function checkBlocklist(req, res) {
  try {
    const name = (req.query.name || '').trim();
    if (!name) return res.json({ blocked: false, matches: [] });

    const [rows] = await pool.query(
      `SELECT b.person_name, b.reason, res.full_name AS reported_by
       FROM BlockList b
       JOIN Residents res ON res.resident_id = b.resident_id
       WHERE b.person_name LIKE ?`,
      [`%${name}%`]
    );

    res.json({ blocked: rows.length > 0, matches: rows });
  } catch (err) {
    res.status(500).json({ message: 'Error checking block list.', error: err.message });
  }
}

module.exports = { addToBlocklist, getMyBlocklist, removeFromBlocklist, checkBlocklist };
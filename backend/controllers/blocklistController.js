const pool = require('../config/db');

const tokenize = (s) => (s || '').toUpperCase().split(/[\s,.\-]+/).filter((t) => t.length >= 2);

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

// GET /api/blocklist/check?name=  (Guard) - check if a visitor's name matches a blocked person.
// Token-based matching (para hindi mag-over/under match) + isinasama ang detalye
// ng nag-report na resident (pangalan, unit, contact) para sa mabilis+secure na verification.
async function checkBlocklist(req, res) {
  try {
    const name = (req.query.name || '').trim();
    if (!name) return res.json({ blocked: false, matches: [] });
    const scanned = tokenize(name);
    if (scanned.length === 0) return res.json({ blocked: false, matches: [] });

    const [rows] = await pool.query(
      `SELECT b.block_id, b.person_name, b.reason, b.added_at,
              res.resident_id, res.full_name AS reported_by,
              res.unit_address, res.phone_number AS reported_by_contact
       FROM BlockList b
       JOIN Residents res ON res.resident_id = b.resident_id
       ORDER BY b.block_id DESC`
    );

    // Tugma kung LAHAT ng token ng blocklisted name ay nasa scanned name (o kabaligtaran).
    const matches = rows.filter((r) => {
      const bl = tokenize(r.person_name);
      if (bl.length === 0) return false;
      const allBlInScan = bl.every((t) => scanned.includes(t));
      const allScanInBl = scanned.every((t) => bl.includes(t));
      return allBlInScan || allScanInBl;
    });

    res.json({ blocked: matches.length > 0, matches });
  } catch (err) {
    res.status(500).json({ message: 'Error checking block list.', error: err.message });
  }
}

module.exports = { addToBlocklist, getMyBlocklist, removeFromBlocklist, checkBlocklist };
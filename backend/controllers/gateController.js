const pool = require('../config/db');

// GET /api/gates - list all gates (any logged-in user)
async function getGates(req, res) {
  try {
    const [rows] = await pool.query('SELECT gate_id, gate_name FROM Gates ORDER BY gate_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching gates.', error: err.message });
  }
}

// POST /api/gates (Admin) - add a gate
async function createGate(req, res) {
  try {
    const { gateName } = req.body;
    if (!gateName) return res.status(400).json({ message: 'Gate name is required.' });

    await pool.query('INSERT INTO Gates (gate_name) VALUES (?)', [gateName]);
    res.status(201).json({ message: 'Gate created.' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating gate.', error: err.message });
  }
}

// PUT /api/gates/:id (Admin) - rename a gate
async function updateGate(req, res) {
  try {
    const { id } = req.params;
    const { gateName } = req.body;
    if (!gateName) return res.status(400).json({ message: 'Gate name is required.' });

    const [result] = await pool.query('UPDATE Gates SET gate_name = ? WHERE gate_id = ?', [gateName, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Gate not found.' });
    res.json({ message: 'Gate updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating gate.', error: err.message });
  }
}

// DELETE /api/gates/:id (Admin) - delete a gate
async function deleteGate(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Gates WHERE gate_id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Gate not found.' });
    res.json({ message: 'Gate deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting gate.', error: err.message });
  }
}

module.exports = { getGates, createGate, updateGate, deleteGate };
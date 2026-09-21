const pool = require('../config/db');

// POST /api/gate/pickup  (Resident) — abisuhan ang gate na may darating na pickup/ride-hailing
async function notifyPickup(req, res) {
  try {
    const residentId = req.user.residentId;
    if (!residentId) return res.status(403).json({ message: 'Only residents can notify the gate.' });
    const { rideHailing, note } = req.body || {};

    // Iwas duplicate: kung may naka-Waiting na ang resident na ito, i-refresh lang ang oras/detalye.
    const [ex] = await pool.query(
      `SELECT pickup_id FROM GatePickups WHERE resident_id = ? AND status = 'Waiting' LIMIT 1`,
      [residentId]
    );
    if (ex.length) {
      await pool.query(
        `UPDATE GatePickups SET ride_hailing = ?, note = ?, created_at = NOW() WHERE pickup_id = ?`,
        [rideHailing ? 1 : 0, note || null, ex[0].pickup_id]
      );
      return res.json({ message: 'Gate notified (updated).', pickupId: ex[0].pickup_id });
    }

    const [r] = await pool.query(
      `INSERT INTO GatePickups (resident_id, ride_hailing, note, status) VALUES (?, ?, ?, 'Waiting')`,
      [residentId, rideHailing ? 1 : 0, note || null]
    );
    res.status(201).json({ message: 'Gate notified.', pickupId: r.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error notifying gate.', error: err.message });
  }
}

// GET /api/gate/pickups  (Guard) — listahan ng mga resident na naghihintay ng pickup
async function getWaitingPickups(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.pickup_id, p.resident_id, p.ride_hailing, p.note, p.created_at,
              res.full_name, res.unit_address, res.phone_number AS contact_number
       FROM GatePickups p
       JOIN Residents res ON res.resident_id = p.resident_id
       WHERE p.status = 'Waiting'
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pickups.', error: err.message });
  }
}

// PUT /api/gate/pickup/:id/done  (Guard) — markahan tapos na (nasundo na)
async function resolvePickup(req, res) {
  try {
    await pool.query(
      `UPDATE GatePickups SET status = 'Done', resolved_at = NOW() WHERE pickup_id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Pickup resolved.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving pickup.', error: err.message });
  }
}

// GET /api/gate/pickup/mine  (Resident) — para makita ng resident kung naka-Waiting pa
async function myPickup(req, res) {
  try {
    const residentId = req.user.residentId;
    const [rows] = await pool.query(
      `SELECT pickup_id, ride_hailing, note, status, created_at
       FROM GatePickups WHERE resident_id = ? AND status = 'Waiting'
       ORDER BY created_at DESC LIMIT 1`,
      [residentId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pickup.', error: err.message });
  }
}

module.exports = { notifyPickup, getWaitingPickups, resolvePickup, myPickup };
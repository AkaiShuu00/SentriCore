const pool = require('../config/db');

// POST /api/registrations  (Resident) - create single/batch/delivery
async function createRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { registrationType, batchName, orderId, purpose, expectedDate, visitorNames } = req.body;

    if (!registrationType || !expectedDate) {
      return res.status(400).json({ message: 'Registration type and expected date are required.' });
    }

    let names = Array.isArray(visitorNames) ? visitorNames.filter(n => n && n.trim()) : [];

    if (registrationType === 'Delivery') {
      if (!orderId) return res.status(400).json({ message: 'Order ID is required for a delivery.' });
      if (names.length === 0) names = ['Delivery Driver'];
    } else if (names.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one visitor name.' });
    }

    await conn.beginTransaction();

    const [reg] = await conn.query(
      `INSERT INTO VisitorRegistrations (resident_id, registration_type, batch_name, order_id, purpose, expected_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [residentId, registrationType, batchName || null, orderId || null, purpose || null, expectedDate]
    );

    for (const name of names) {
      await conn.query(
        `INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`,
        [reg.insertId, name.trim()]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Registration created.', registrationId: reg.insertId, visitorCount: names.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error creating registration.', error: err.message });
  } finally {
    conn.release();
  }
}

// GET /api/registrations  (Resident) - own registrations
async function getMyRegistrations(req, res) {
  try {
    const residentId = req.user.residentId;
    const [rows] = await pool.query(
      `SELECT r.registration_id, r.registration_type, r.batch_name, r.order_id,
              r.purpose, r.expected_date, r.status, r.created_at
       FROM VisitorRegistrations r
       WHERE r.resident_id = ?
       ORDER BY r.registration_id DESC`,
      [residentId]
    );

    for (const reg of rows) {
      const [details] = await pool.query(
        `SELECT visitor_name FROM VisitorRegistrationDetails WHERE registration_id = ?`,
        [reg.registration_id]
      );
      reg.visitors = details.map(d => d.visitor_name);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching registrations.', error: err.message });
  }
}

// PUT /api/registrations/:id  (Resident) - edit, only while Expected (no gate activity)
async function updateRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const residentId = req.user.residentId;
    const { purpose, expectedDate, batchName, orderId, visitorNames } = req.body;

    const [reg] = await conn.query(
      `SELECT registration_type FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (reg.length === 0) return res.status(404).json({ message: 'Registration not found.' });

    const [used] = await conn.query(
      `SELECT transaction_id FROM VisitorTransactions WHERE registration_id = ? LIMIT 1`,
      [id]
    );
    if (used.length > 0) {
      return res.status(400).json({ message: 'This registration already has gate activity and can no longer be edited.' });
    }

    let names = Array.isArray(visitorNames) ? visitorNames.filter(n => n && n.trim()) : [];
    if (reg[0].registration_type === 'Delivery' && names.length === 0) names = ['Delivery Driver'];
    if (names.length === 0) return res.status(400).json({ message: 'Please provide at least one visitor name.' });

    await conn.beginTransaction();

    await conn.query(
      `UPDATE VisitorRegistrations SET purpose = ?, expected_date = ?, batch_name = ?, order_id = ?
       WHERE registration_id = ?`,
      [purpose || null, expectedDate, batchName || null, orderId || null, id]
    );

    await conn.query(`DELETE FROM VisitorRegistrationDetails WHERE registration_id = ?`, [id]);
    for (const name of names) {
      await conn.query(
        `INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`,
        [id, name.trim()]
      );
    }

    await conn.commit();
    res.json({ message: 'Registration updated.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error updating registration.', error: err.message });
  } finally {
    conn.release();
  }
}

// DELETE /api/registrations/:id  (Resident) - delete, only while Expected
async function deleteRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const residentId = req.user.residentId;

    const [reg] = await conn.query(
      `SELECT registration_id FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (reg.length === 0) return res.status(404).json({ message: 'Registration not found.' });

    const [used] = await conn.query(
      `SELECT transaction_id FROM VisitorTransactions WHERE registration_id = ? LIMIT 1`,
      [id]
    );
    if (used.length > 0) {
      return res.status(400).json({ message: 'This registration already has gate activity and can no longer be deleted.' });
    }

    await conn.beginTransaction();
    await conn.query(`DELETE FROM VisitorRegistrationDetails WHERE registration_id = ?`, [id]);
    await conn.query(`DELETE FROM VisitorRegistrations WHERE registration_id = ?`, [id]);
    await conn.commit();

    res.json({ message: 'Registration deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error deleting registration.', error: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { createRegistration, getMyRegistrations, updateRegistration, deleteRegistration };
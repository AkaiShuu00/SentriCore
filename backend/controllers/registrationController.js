const pool = require('../config/db');

// POST /api/registrations  (Resident) - create a pre-registration
async function createRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { registrationType, batchName, orderId, purpose, expectedDate, visitorNames } = req.body;

    if (!registrationType || !expectedDate) {
      return res.status(400).json({ message: 'Registration type and expected date are required.' });
    }
    if (!Array.isArray(visitorNames) || visitorNames.length === 0) {
      return res.status(400).json({ message: 'At least one visitor name is required.' });
    }

    await conn.beginTransaction();

    const [reg] = await conn.query(
      `INSERT INTO VisitorRegistrations
        (resident_id, registration_type, batch_name, order_id, purpose, expected_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Expected')`,
      [
        residentId,
        registrationType,
        batchName || null,
        orderId || null,
        purpose || null,
        expectedDate,
      ]
    );
    const registrationId = reg.insertId;

    for (const name of visitorNames) {
      if (name && name.trim()) {
        await conn.query(
          `INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`,
          [registrationId, name.trim()]
        );
      }
    }

    await conn.commit();
    res.status(201).json({
      message: 'Registration created.',
      registrationId,
      visitorCount: visitorNames.filter((n) => n && n.trim()).length,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error creating registration.', error: err.message });
  } finally {
    conn.release();
  }
}

// GET /api/registrations  (Resident) - list my registrations w/ PER-VISITOR status
async function getMyRegistrations(req, res) {
  try {
    const residentId = req.user.residentId;

    const [regs] = await pool.query(
      `SELECT registration_id, registration_type, batch_name, order_id,
              purpose, DATE_FORMAT(expected_date, '%Y-%m-%d') AS expected_date,
              status, created_at
       FROM VisitorRegistrations
       WHERE resident_id = ?
       ORDER BY registration_id DESC`,
      [residentId]
    );

    const result = [];
    for (const r of regs) {
      // Lahat ng miyembro
      const [details] = await pool.query(
        `SELECT visitor_name FROM VisitorRegistrationDetails WHERE registration_id = ?`,
        [r.registration_id]
      );
      // Transactions ng registration na ito (para sa PER-VISITOR status)
      const [txs] = await pool.query(
        `SELECT visitor_name, status, entry_time, exit_time
         FROM VisitorTransactions WHERE registration_id = ?`,
        [r.registration_id]
      );
      const txByName = {};
      for (const t of txs) txByName[(t.visitor_name || '').toUpperCase()] = t;

      // Bawat visitor may sariling status base sa transaction
      const visitors = details.map((d) => {
        const t = txByName[(d.visitor_name || '').toUpperCase()];
        let status = 'Expected', timeIn = null, timeOut = null;
        if (t) {
          timeIn = t.entry_time;
          timeOut = t.exit_time;
          if (t.status === 'Active') status = 'Active';
          else if (t.status === 'Completed') status = 'Departed';
        }
        return { name: d.visitor_name, status, timeIn, timeOut };
      });

      result.push({
        registration_id: r.registration_id,
        registration_type: r.registration_type,
        batch_name: r.batch_name,
        order_id: r.order_id,
        purpose: r.purpose,
        expected_date: r.expected_date,
        status: r.status,          // registration-level (para sa summary/filter)
        created_at: r.created_at,
        visitors,                  // ← per-visitor na may sariling status
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching registrations.', error: err.message });
  }
}

// PUT /api/registrations/:id  (Resident) - update a registration
async function updateRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { id } = req.params;
    const { purpose, expectedDate, visitorNames } = req.body;

    const [own] = await conn.query(
      `SELECT registration_id FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (own.length === 0) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE VisitorRegistrations SET purpose = ?, expected_date = ? WHERE registration_id = ?`,
      [purpose || null, expectedDate || null, id]
    );

    if (Array.isArray(visitorNames)) {
      await conn.query(`DELETE FROM VisitorRegistrationDetails WHERE registration_id = ?`, [id]);
      for (const name of visitorNames) {
        if (name && name.trim()) {
          await conn.query(
            `INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`,
            [id, name.trim()]
          );
        }
      }
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

// DELETE /api/registrations/:id  (Resident) - delete a registration
async function deleteRegistration(req, res) {
  try {
    const residentId = req.user.residentId;
    const { id } = req.params;

    const [own] = await pool.query(
      `SELECT registration_id FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (own.length === 0) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    await pool.query(`DELETE FROM VisitorRegistrations WHERE registration_id = ?`, [id]);
    res.json({ message: 'Registration deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting registration.', error: err.message });
  }
}

module.exports = { createRegistration, getMyRegistrations, updateRegistration, deleteRegistration };
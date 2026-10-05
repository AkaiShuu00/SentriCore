const pool = require('../config/db');

// Helper: pwede lang baguhin/burahin kung "Expected" pa at WALANG dumating na bisita.
async function isEditable(conn, registrationId) {
  const [[reg]] = await conn.query(
    `SELECT status FROM VisitorRegistrations WHERE registration_id = ?`,
    [registrationId]
  );
  if (!reg) return { ok: false, code: 404, msg: 'Registration not found.' };
  if (String(reg.status) !== 'Expected') {
    return { ok: false, code: 403, msg: 'This registration can no longer be changed because a visitor has already arrived.' };
  }
  // Kung may kahit isang transaction na (dumating na ang bisita), hindi na rin pwede.
  const [[tx]] = await conn.query(
    `SELECT COUNT(*) AS n FROM VisitorTransactions WHERE registration_id = ?`,
    [registrationId]
  );
  if (tx.n > 0) {
    return { ok: false, code: 403, msg: 'This registration can no longer be changed because a visitor has already arrived.' };
  }
  return { ok: true };
}

// POST /api/registrations  (Resident) - create a pre-registration
async function createRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { registrationType, batchName, orderId, purpose, expectedDate, visitorNames } = req.body;

    if (!registrationType || !expectedDate) {
      return res.status(400).json({ message: 'Registration type and expected date are required.' });
    }

    const cleanNames = Array.isArray(visitorNames)
      ? visitorNames.map((n) => (n || '').trim()).filter(Boolean)
      : [];

    const isDelivery = String(registrationType).toLowerCase() === 'delivery';

    let effectiveNames = cleanNames;
    if (cleanNames.length === 0) {
      if (isDelivery) {
        effectiveNames = ['Delivery Rider'];
      } else {
        return res.status(400).json({ message: 'At least one visitor name is required.' });
      }
    }

    await conn.beginTransaction();

    const [reg] = await conn.query(
      `INSERT INTO VisitorRegistrations
        (resident_id, registration_type, batch_name, order_id, purpose, expected_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Expected')`,
      [residentId, registrationType, batchName || null, orderId || null, purpose || null, expectedDate]
    );
    const registrationId = reg.insertId;

    for (const name of effectiveNames) {
      await conn.query(
        `INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`,
        [registrationId, name]
      );
    }

    await conn.commit();
    res.status(201).json({
      message: 'Registration created.',
      registrationId,
      visitorCount: effectiveNames.length,
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
      const [details] = await pool.query(
        `SELECT visitor_name FROM VisitorRegistrationDetails WHERE registration_id = ?`,
        [r.registration_id]
      );
      const [txs] = await pool.query(
        `SELECT visitor_name, status, entry_time, exit_time, pass_number, plate_number
         FROM VisitorTransactions WHERE registration_id = ?`,
        [r.registration_id]
      );
      const txByName = {};
      for (const t of txs) txByName[(t.visitor_name || '').toUpperCase()] = t;

      // ⬇️ CHANGE (delivery): ang rider name ay madalas hindi tumutugma sa placeholder,
      // kaya gumamit tayo ng registration-level na status mula sa aktwal na transaction.
      const isDelivery = String(r.registration_type) === 'Delivery';
      const anyActive = txs.some((t) => t.status === 'Active');
      const anyTx = txs.length > 0;
      const allCompleted = anyTx && txs.every((t) => t.status === 'Completed');
      const deliveryTx = isDelivery ? (txs.find((t) => t.status === 'Active') || txs[txs.length - 1]) : null;

      const visitors = details.map((d) => {
        let t = txByName[(d.visitor_name || '').toUpperCase()];
        if (!t && isDelivery) t = deliveryTx;   // delivery: fallback sa transaction ng registration
        let status = 'Expected', timeIn = null, timeOut = null, passNumber = null, plateNumber = null;
        if (t) {
          timeIn = t.entry_time;
          timeOut = t.exit_time;
          passNumber = t.pass_number || null;
          plateNumber = t.plate_number || null;
          if (t.status === 'Active') status = 'Active';
          else if (t.status === 'Completed') status = 'Departed';
        }
        // Delivery safety net gamit ang registration-level signal
        if (isDelivery && status === 'Expected') {
          if (anyActive) status = 'Active';
          else if (allCompleted) status = 'Departed';
        }
        return { name: d.visitor_name, status, timeIn, timeOut, pass_number: passNumber, plate_number: plateNumber };
      });

      // ⬇️ CHANGE (#1): canManage = Expected pa AT walang dumating na bisita
      const anyArrived = txs.length > 0 || visitors.some((v) => v.status !== 'Expected');
      const canManage = String(r.status) === 'Expected' && !anyArrived;

      result.push({
        registration_id: r.registration_id,
        registration_type: r.registration_type,
        batch_name: r.batch_name,
        order_id: r.order_id,
        purpose: r.purpose,
        expected_date: r.expected_date,
        status: r.status,
        created_at: r.created_at,
        canManage,                 // ← gagamitin ng frontend para ipakita ang Edit/Delete
        visitors,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching registrations.', error: err.message });
  }
}

// PUT /api/registrations/:id  (Resident) - EDIT date + purpose LANG, Expected-only
async function updateRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { id } = req.params;
    const { purpose, expectedDate } = req.body;   // ⬅️ date + purpose LANG

    const [own] = await conn.query(
      `SELECT registration_id FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (own.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // ⬇️ CHANGE (#1): Expected-only guard
    const chk = await isEditable(conn, id);
    if (!chk.ok) { conn.release(); return res.status(chk.code).json({ message: chk.msg }); }

    if (!expectedDate && purpose === undefined) {
      conn.release();
      return res.status(400).json({ message: 'Nothing to update. Provide expectedDate and/or purpose.' });
    }

    const fields = [];
    const vals = [];
    if (purpose !== undefined) { fields.push('purpose = ?'); vals.push(purpose || null); }
    if (expectedDate) { fields.push('expected_date = ?'); vals.push(expectedDate); }
    vals.push(id);

    await conn.query(
      `UPDATE VisitorRegistrations SET ${fields.join(', ')} WHERE registration_id = ?`,
      vals
    );
    res.json({ message: 'Registration updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating registration.', error: err.message });
  } finally {
    conn.release();
  }
}

// DELETE /api/registrations/:id  (Resident) - Expected-only delete
async function deleteRegistration(req, res) {
  const conn = await pool.getConnection();
  try {
    const residentId = req.user.residentId;
    const { id } = req.params;

    const [own] = await conn.query(
      `SELECT registration_id FROM VisitorRegistrations WHERE registration_id = ? AND resident_id = ?`,
      [id, residentId]
    );
    if (own.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // ⬇️ CHANGE (#1): Expected-only guard
    const chk = await isEditable(conn, id);
    if (!chk.ok) { conn.release(); return res.status(chk.code).json({ message: chk.msg }); }

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
const pool = require('../config/db');

// Helper: split a name into uppercase word tokens
function tokenize(s) {
  return (s || '')
    .toUpperCase()
    .split(/[\s,.\-]+/)
    .filter(t => t.length >= 2);
}

// GET /api/entry/match?name=  (Guard) - match OCR name to an expected registration
async function matchVisitor(req, res) {
  try {
    const name = req.query.name || '';
    const searchTokens = tokenize(name);
    if (searchTokens.length === 0) {
      return res.json({ matched: false, candidates: [] });
    }

    // Get expected registrations that have NO gate activity yet
    const [regs] = await pool.query(
      `SELECT r.registration_id, r.registration_type, r.batch_name, r.purpose,
              r.expected_date, res.resident_id, res.full_name AS resident_name, res.unit_address,
              d.visitor_name
       FROM VisitorRegistrations r
       JOIN Residents res ON res.resident_id = r.resident_id
       JOIN VisitorRegistrationDetails d ON d.registration_id = r.registration_id
       WHERE r.status = 'Expected'`
    );

    const candidates = [];
    for (const reg of regs) {
      const regTokens = tokenize(reg.visitor_name);
      const score = regTokens.filter(t => searchTokens.includes(t)).length;
      const required = regTokens.length >= 2 ? 2 : 1; // surname alone must not match
      if (score >= required) {
        candidates.push({
          registrationId: reg.registration_id,
          registeredName: reg.visitor_name,
          residentId: reg.resident_id,
          residentName: reg.resident_name,
          residentAddress: reg.unit_address,
          registrationType: reg.registration_type,
          batchName: reg.batch_name,
          purpose: reg.purpose,
          expectedDate: reg.expected_date,
          score
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    res.json({ matched: candidates.length > 0, candidates });
  } catch (err) {
    res.status(500).json({ message: 'Error matching visitor.', error: err.message });
  }
}

// POST /api/entry/group  (Guard) - record entry for one or more visitors
async function createGroupEntry(req, res) {
  const conn = await pool.getConnection();
  try {
    const guardId = req.user.guardId;
    const gateId = req.user.gateId;
    const { visitors } = req.body; // array of visitor objects

    if (!Array.isArray(visitors) || visitors.length === 0) {
      return res.status(400).json({ message: 'No visitors to log.' });
    }

    await conn.beginTransaction();

    // If more than one visitor, they share an arrival
    let arrivalId = null;
    if (visitors.length >= 2) {
      const [arr] = await conn.query(`INSERT INTO Arrivals () VALUES ()`);
      arrivalId = arr.insertId;
    }

    const created = [];
    for (const v of visitors) {
      const [tx] = await conn.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, arrival_id, visitor_name,
           visitor_type, purpose, plate_number, pass_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.residentId, guardId, gateId, v.registrationId || null, arrivalId,
          v.visitorName, v.visitorType || 'Visitor', v.purpose || null,
          v.plateNumber || null, v.passNumber || null, v.status || 'Active'
        ]
      );
      created.push(tx.insertId);
    }

    await conn.commit();
    res.status(201).json({ message: 'Entry recorded.', arrivalId, count: created.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error recording entry.', error: err.message });
  } finally {
    conn.release();
  }
}

// GET /api/entry/active  (Guard) - all visitors currently inside
async function getActiveVisitors(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.purpose,
              t.plate_number, t.pass_number, t.entry_time, t.arrival_id,
              res.full_name AS resident_name
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       WHERE t.status = 'Active'
       ORDER BY t.transaction_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching active visitors.', error: err.message });
  }
}

// POST /api/entry/:id/exit  (Guard) - record a visitor's exit
async function recordExit(req, res) {
  try {
    const { id } = req.params;
    const exitGuardId = req.user.guardId;

    const [rows] = await pool.query(
      `SELECT transaction_id FROM VisitorTransactions WHERE transaction_id = ? AND status = 'Active'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Active visitor not found.' });
    }

    await pool.query(
      `UPDATE VisitorTransactions
       SET status = 'Completed', exit_time = NOW(), exit_guard_id = ?
       WHERE transaction_id = ?`,
      [exitGuardId, id]
    );

    res.json({ message: 'Exit recorded.' });
  } catch (err) {
    res.status(500).json({ message: 'Error recording exit.', error: err.message });
  }
}

module.exports = { matchVisitor, createGroupEntry, getActiveVisitors, recordExit };
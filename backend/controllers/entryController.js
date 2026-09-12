const pool = require('../config/db');

function tokenize(s) {
  return (s || '').toUpperCase().split(/[\s,.\-]+/).filter(t => t.length >= 2);
}

// GET /api/entry/match?name=  (Guard)
async function matchVisitor(req, res) {
  try {
    const name = req.query.name || '';
    const searchTokens = tokenize(name);
    if (searchTokens.length === 0) return res.json({ matched: false, candidates: [] });

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
      if (regTokens.length === 0) continue;
      const overlap = regTokens.filter((t) => searchTokens.includes(t)).length;
      let isMatch = searchTokens.length >= 2 ? regTokens.every((t) => searchTokens.includes(t)) : overlap >= 1;
      if (isMatch) {
        candidates.push({
          registrationId: reg.registration_id, registeredName: reg.visitor_name,
          residentId: reg.resident_id, residentName: reg.resident_name, residentAddress: reg.unit_address,
          registrationType: reg.registration_type, batchName: reg.batch_name,
          purpose: reg.purpose, expectedDate: reg.expected_date, score: overlap,
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    res.json({ matched: candidates.length > 0, candidates });
  } catch (err) {
    res.status(500).json({ message: 'Error matching visitor.', error: err.message });
  }
}

// POST /api/entry/group  (Guard)
async function createGroupEntry(req, res) {
  const conn = await pool.getConnection();
  try {
    const guardId = req.user.guardId;
    const gateId = req.user.gateId;
    const { visitors } = req.body;
    if (!Array.isArray(visitors) || visitors.length === 0) {
      return res.status(400).json({ message: 'No visitors to log.' });
    }

    await conn.beginTransaction();
    let arrivalId = null;
    if (visitors.length >= 2) {
      const [arr] = await conn.query(`INSERT INTO Arrivals () VALUES ()`);
      arrivalId = arr.insertId;
    }

    const created = [];
    const touchedRegs = new Set();
    for (const v of visitors) {
      const [tx] = await conn.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, arrival_id, visitor_name,
           visitor_type, purpose, plate_number, pass_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.residentId, guardId, gateId, v.registrationId || null, arrivalId,
         v.visitorName, v.visitorType || 'Visitor', v.purpose || null,
         v.plateNumber || null, v.passNumber || null, v.status || 'Active']
      );
      created.push(tx.insertId);
      if (v.registrationId) touchedRegs.add(v.registrationId);
    }

    for (const regId of touchedRegs) {
      try {
        await conn.query(`UPDATE VisitorRegistrations SET status = 'Active' WHERE registration_id = ?`, [regId]);
      } catch (regErr) { console.warn('Reg status skipped:', regErr.message); }
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

// GET /api/entry/active  (Guard)
async function getActiveVisitors(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.purpose,
              t.plate_number, t.pass_number, t.entry_time, t.arrival_id, t.registration_id,
              res.resident_id, res.full_name AS resident_name, res.unit_address,
              vr.registration_type, vr.batch_name
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN VisitorRegistrations vr ON vr.registration_id = t.registration_id
       WHERE t.status = 'Active'
       ORDER BY t.transaction_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching active visitors.', error: err.message });
  }
}

// GET /api/entry/history  (Guard)
async function getHistory(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.purpose,
              t.plate_number, t.pass_number, t.entry_time, t.exit_time, t.status, t.registration_id,
              res.full_name AS resident_name, res.unit_address, vr.registration_type
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN VisitorRegistrations vr ON vr.registration_id = t.registration_id
       WHERE t.status = 'Completed'
       ORDER BY t.exit_time DESC, t.transaction_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history.', error: err.message });
  }
}

// GET /api/entry/all-logs  (Admin/Guard) - LAHAT ng transactions
async function getAllLogs(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.purpose,
              t.plate_number, t.pass_number, t.entry_time, t.exit_time, t.status, t.registration_id,
              res.full_name AS resident_name, res.unit_address,
              vr.registration_type, g.full_name AS guard_name
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN VisitorRegistrations vr ON vr.registration_id = t.registration_id
       LEFT JOIN Guards g ON g.guard_id = t.guard_id
       ORDER BY t.transaction_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching logs.', error: err.message });
  }
}

// GET /api/entry/admin-summary  (Admin) - dashboard stats + recent activity
async function getAdminSummary(req, res) {
  try {
    const [[active]] = await pool.query(`SELECT COUNT(*) AS n FROM VisitorTransactions WHERE status = 'Active'`);

    // Today's entries — gamitin ang parehong araw base sa server local date
    const [[todayEntries]] = await pool.query(
      `SELECT COUNT(*) AS n FROM VisitorTransactions
       WHERE entry_time >= CURDATE() AND entry_time < CURDATE() + INTERVAL 1 DAY`
    );

    const [[expected]] = await pool.query(
      `SELECT COUNT(*) AS n
       FROM VisitorRegistrationDetails d
       JOIN VisitorRegistrations r ON r.registration_id = d.registration_id
       WHERE r.status = 'Expected' AND DATE(r.expected_date) = CURDATE()`
    );

    // Active gates — subukan muna ang guards na may status 'Active';
    // kung walang status column o walang active, gamitin ang lahat ng distinct gates.
    let activeGates = 0;
    try {
      const [[g]] = await pool.query(
        `SELECT COUNT(DISTINCT gate_id) AS n FROM Guards
         WHERE gate_id IS NOT NULL AND (status = 'Active' OR status = 'On Duty' OR status = 'ON DUTY')`
      );
      activeGates = g.n;
    } catch (e) { activeGates = 0; }
    // Fallback: kung 0, bilangin lahat ng distinct gates na may naka-assign na guard
    if (!activeGates) {
      try {
        const [[g2]] = await pool.query(`SELECT COUNT(DISTINCT gate_id) AS n FROM Guards WHERE gate_id IS NOT NULL`);
        activeGates = g2.n;
      } catch (e) { activeGates = 0; }
    }

    const [[total]] = await pool.query(`SELECT COUNT(*) AS n FROM VisitorTransactions`);

    const [recent] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.status, t.entry_time, t.exit_time,
              res.full_name AS resident_name, res.unit_address, g.full_name AS guard_name
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN Guards g ON g.guard_id = t.guard_id
       ORDER BY t.transaction_id DESC LIMIT 8`
    );

    const [inside] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.entry_time,
              res.full_name AS resident_name, res.unit_address
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       WHERE t.status = 'Active'
       ORDER BY t.transaction_id DESC LIMIT 8`
    );

    res.json({
      stats: { activeVisitors: active.n, todayEntries: todayEntries.n, expectedToday: expected.n, activeGates, total: total.n },
      recent: recent.map((r) => ({
        id: r.transaction_id, name: r.visitor_name, resident: r.resident_name, unit: r.unit_address,
        guard: r.guard_name || '—', status: r.status, entry: r.entry_time, exit: r.exit_time,
      })),
      inside: inside.map((r) => ({
        id: r.transaction_id, name: r.visitor_name, resident: r.resident_name, unit: r.unit_address, entry: r.entry_time,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin summary.', error: err.message });
  }
}

// GET /api/entry/residents  (Guard)
async function getResidentsForGuard(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT resident_id, full_name, unit_address, phone_number AS contact_number, email
       FROM Residents ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching residents.', error: err.message });
  }
}

// GET /api/entry/companions  (Guard)
async function getCompanions(req, res) {
  try {
    const { registrationId, single } = req.query;

    if (registrationId) {
      const [members] = await pool.query(
        `SELECT d.visitor_name, r.registration_id, r.purpose,
                res.resident_id, res.full_name AS resident_name, res.unit_address
         FROM VisitorRegistrationDetails d
         JOIN VisitorRegistrations r ON r.registration_id = d.registration_id
         JOIN Residents res ON res.resident_id = r.resident_id
         WHERE d.registration_id = ?`, [registrationId]
      );
      const [active] = await pool.query(
        `SELECT visitor_name FROM VisitorTransactions WHERE registration_id = ? AND status = 'Active'`, [registrationId]
      );
      const activeNames = new Set(active.map((a) => (a.visitor_name || '').toUpperCase()));
      return res.json(members
        .filter((m) => !activeNames.has((m.visitor_name || '').toUpperCase()))
        .map((m) => ({ name: m.visitor_name, registrationId: m.registration_id, residentId: m.resident_id,
                       resident: m.resident_name, address: m.unit_address, purpose: m.purpose })));
    }

    if (single) {
      const [rows] = await pool.query(
        `SELECT d.visitor_name, r.registration_id, r.purpose,
                res.resident_id, res.full_name AS resident_name, res.unit_address
         FROM VisitorRegistrations r
         JOIN VisitorRegistrationDetails d ON d.registration_id = r.registration_id
         JOIN Residents res ON res.resident_id = r.resident_id
         WHERE r.registration_type = 'Single' AND r.status = 'Expected'`
      );
      return res.json(rows.map((m) => ({ name: m.visitor_name, registrationId: m.registration_id, residentId: m.resident_id,
                                         resident: m.resident_name, address: m.unit_address, purpose: m.purpose })));
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching companions.', error: err.message });
  }
}

// GET /api/entry/schedule  (Guard)
async function getSchedule(req, res) {
  try {
    const [regs] = await pool.query(
      `SELECT r.registration_id, r.registration_type, r.batch_name, r.purpose, r.expected_date, r.status,
              res.resident_id, res.full_name AS resident_name, res.unit_address
       FROM VisitorRegistrations r
       JOIN Residents res ON res.resident_id = r.resident_id
       WHERE r.status IN ('Expected','Active')
       ORDER BY r.registration_id DESC`
    );

    const result = [];
    for (const r of regs) {
      const [details] = await pool.query(`SELECT visitor_name FROM VisitorRegistrationDetails WHERE registration_id = ?`, [r.registration_id]);
      const [txs] = await pool.query(
        `SELECT visitor_name, status, entry_time, exit_time, arrival_id, transaction_id
         FROM VisitorTransactions WHERE registration_id = ?`, [r.registration_id]
      );
      const txByName = {};
      for (const t of txs) txByName[(t.visitor_name || '').toUpperCase()] = t;

      const visitors = details.map((d) => {
        const t = txByName[(d.visitor_name || '').toUpperCase()];
        let status = 'EXPECTED', timeIn = null, timeOut = null, arrivalId = null, transactionId = null;
        if (t) {
          transactionId = t.transaction_id; arrivalId = t.arrival_id; timeIn = t.entry_time; timeOut = t.exit_time;
          if (t.status === 'Active') status = 'ACTIVE';
          else if (t.status === 'Completed') status = 'DEPARTED';
        }
        return { name: d.visitor_name, status, timeIn, timeOut, arrivalId, transactionId };
      });

      result.push({
        registrationId: r.registration_id, registrationType: r.registration_type, batchName: r.batch_name,
        purpose: r.purpose, expectedDate: r.expected_date, resident: r.resident_name, address: r.unit_address,
        residentId: r.resident_id, visitors,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching schedule.', error: err.message });
  }
}

// POST /api/entry/:id/exit  (Guard)
async function recordExit(req, res) {
  try {
    const { id } = req.params;
    const exitGuardId = req.user.guardId;

    const [rows] = await pool.query(
      `SELECT transaction_id, registration_id FROM VisitorTransactions WHERE transaction_id = ? AND status = 'Active'`, [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Active visitor not found.' });
    const regId = rows[0].registration_id;

    await pool.query(
      `UPDATE VisitorTransactions SET status = 'Completed', exit_time = NOW(), exit_guard_id = ? WHERE transaction_id = ?`,
      [exitGuardId, id]
    );

    if (regId) {
      try {
        const [members] = await pool.query(`SELECT COUNT(*) AS n FROM VisitorRegistrationDetails WHERE registration_id = ?`, [regId]);
        const totalMembers = members[0].n;
        const [entered] = await pool.query(`SELECT COUNT(DISTINCT visitor_name) AS n FROM VisitorTransactions WHERE registration_id = ?`, [regId]);
        const enteredCount = entered[0].n;
        const [stillActive] = await pool.query(`SELECT transaction_id FROM VisitorTransactions WHERE registration_id = ? AND status = 'Active' LIMIT 1`, [regId]);

        if (stillActive.length > 0) {
          await pool.query(`UPDATE VisitorRegistrations SET status = 'Active' WHERE registration_id = ?`, [regId]);
        } else if (enteredCount >= totalMembers) {
          await pool.query(`UPDATE VisitorRegistrations SET status = 'Departed' WHERE registration_id = ?`, [regId]);
        } else {
          await pool.query(`UPDATE VisitorRegistrations SET status = 'Expected' WHERE registration_id = ?`, [regId]);
        }
      } catch (regErr) { console.warn('Reg status skipped:', regErr.message); }
    }

    res.json({ message: 'Exit recorded.' });
  } catch (err) {
    console.error('Error recording exit:', err);
    res.status(500).json({ message: 'Error recording exit.', error: err.message });
  }
}

module.exports = {
  matchVisitor, createGroupEntry, getActiveVisitors, getHistory, getAllLogs, getAdminSummary,
  getResidentsForGuard, getCompanions, getSchedule, recordExit,
};
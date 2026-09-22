const pool = require('../config/db');

function tokenize(s) {
  return (s || '').toUpperCase().split(/[\s,.\-]+/).filter(t => t.length >= 2);
}

/* =========================================================
   AUTO VISITOR PASS
   - Max 100 passes per pool
   - Separate pools: Visitor (V-001..V-100) and Delivery (D-001..D-100)
   - Assign LOWEST available number, gap-fill first
   - Numbers are reused based on ACTIVE status (NOT a daily reset),
     so an overnight visitor keeps their pass until they depart.
   ========================================================= */
const MAX_PASS = 100;

function passPrefix(kind) {
  return (kind === 'Delivery') ? 'D-' : 'V-';
}

function formatPass(kind, num) {
  return `${passPrefix(kind)}${String(num).padStart(3, '0')}`;
}

// Return `count` lowest-available pass numbers (integers) for a pool.
// Uses the connection inside the open transaction so concurrent entries stay consistent.
async function getFreePasses(conn, kind, count) {
  const prefix = passPrefix(kind);
  const [rows] = await conn.query(
    `SELECT pass_number FROM VisitorTransactions
     WHERE status = 'Active' AND pass_number LIKE ?`,
    [`${prefix}%`]
  );
  const used = new Set();
  for (const r of rows) {
    const n = parseInt(String(r.pass_number).replace(prefix, ''), 10);
    if (!isNaN(n)) used.add(n);
  }
  const free = [];
  for (let n = 1; n <= MAX_PASS && free.length < count; n++) {
    if (!used.has(n)) free.push(n);
  }
  return free;
}

// GET /api/entry/match?name=  (Guard)
async function matchVisitor(req, res) {
  try {
    const name = req.query.name || '';
    const searchTokens = tokenize(name);
    if (searchTokens.length === 0) return res.json({ matched: false, candidates: [] });

    // Expected LANG at HINDI pa lipas ang expected_date (walang expired)
    const [regs] = await pool.query(
      `SELECT r.registration_id, r.registration_type, r.batch_name, r.purpose,
              r.expected_date, res.resident_id, res.full_name AS resident_name, res.unit_address,
              d.visitor_name
       FROM VisitorRegistrations r
       JOIN Residents res ON res.resident_id = r.resident_id
       JOIN VisitorRegistrationDetails d ON d.registration_id = r.registration_id
       WHERE r.status = 'Expected' AND DATE(r.expected_date) >= CURDATE()`
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

    // Kapag 2+ visitors na sabay → gumawa ng Arrival (ito ang "sabay sila pumasok" = LINKED/BATCH)
    let arrivalId = null;
    if (visitors.length >= 2) {
      const [arr] = await conn.query(`INSERT INTO Arrivals () VALUES ()`);
      arrivalId = arr.insertId;
    }

    // ---- AUTO-ASSIGN passes per pool (Visitor / Delivery), gap-fill, cap 100 ----
    const kindOf = (v) => (v.visitorType === 'Delivery' ? 'Delivery' : 'Visitor');
    const needV = visitors.filter((v) => kindOf(v) === 'Visitor').length;
    const needD = visitors.filter((v) => kindOf(v) === 'Delivery').length;

    const freeV = needV ? await getFreePasses(conn, 'Visitor', needV) : [];
    const freeD = needD ? await getFreePasses(conn, 'Delivery', needD) : [];

    if (freeV.length < needV || freeD.length < needD) {
      await conn.rollback();
      const which = freeV.length < needV ? 'Visitor' : 'Delivery';
      return res.status(409).json({
        message: `No visitor passes available. All ${MAX_PASS} ${which} passes are currently in use.`,
      });
    }

    let vi = 0, di = 0;
    const assign = (v) => {
      const kind = kindOf(v);
      const num = kind === 'Delivery' ? freeD[di++] : freeV[vi++];
      return formatPass(kind, num);
    };

    const created = [];
    const assignedPasses = [];
    const touchedRegs = new Set();
    for (const v of visitors) {
      const passNumber = assign(v); // AUTO-generated, ignore any guard-typed value
      const [tx] = await conn.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, arrival_id, visitor_name,
           visitor_type, purpose, plate_number, pass_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.residentId, guardId, gateId, v.registrationId || null, arrivalId,
         v.visitorName, v.visitorType || 'Visitor', v.purpose || null,
         v.plateNumber || null, passNumber, v.status || 'Active']
      );
      created.push(tx.insertId);
      assignedPasses.push({ transactionId: tx.insertId, visitorName: v.visitorName, passNumber });
      if (v.registrationId) touchedRegs.add(v.registrationId);
    }

    for (const regId of touchedRegs) {
      try {
        await conn.query(`UPDATE VisitorRegistrations SET status = 'Active' WHERE registration_id = ?`, [regId]);
      } catch (regErr) { console.warn('Reg status skipped:', regErr.message); }
    }

    await conn.commit();
    res.status(201).json({ message: 'Entry recorded.', arrivalId, count: created.length, passes: assignedPasses });
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

// GET /api/entry/history  (Guard) - completed transactions + EXPIRED registrations
async function getHistory(req, res) {
  try {
    // 1) Completed (departed) transactions
    const [txRows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.purpose,
              t.plate_number, t.pass_number, t.entry_time, t.exit_time, t.status, t.registration_id,
              t.arrival_id, t.exit_note, t.exit_additional_note,
              res.full_name AS resident_name, res.unit_address, vr.registration_type
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN VisitorRegistrations vr ON vr.registration_id = t.registration_id
       WHERE t.status = 'Completed'
       ORDER BY t.exit_time DESC, t.transaction_id DESC`
    );

    const completed = txRows.map((t) => ({
      transaction_id: t.transaction_id,
      visitor_name: t.visitor_name,
      visitor_type: t.visitor_type,
      purpose: t.purpose,
      plate_number: t.plate_number,
      pass_number: t.pass_number,
      entry_time: t.entry_time,
      exit_time: t.exit_time,
      status: 'Departed',
      registration_id: t.registration_id,
      arrival_id: t.arrival_id,
      exit_note: t.exit_note,
      exit_additional_note: t.exit_additional_note,
      resident_name: t.resident_name,
      unit_address: t.unit_address,
      registration_type: t.registration_type,
    }));

    // 2) EXPIRED registrations (hindi pumasok, lumipas ang date) — isang row bawat visitor
    const [expRows] = await pool.query(
      `SELECT r.registration_id, r.registration_type, r.purpose, r.expected_date,
              res.full_name AS resident_name, res.unit_address, d.visitor_name
       FROM VisitorRegistrations r
       JOIN Residents res ON res.resident_id = r.resident_id
       JOIN VisitorRegistrationDetails d ON d.registration_id = r.registration_id
       WHERE r.status = 'Expired'
       ORDER BY r.expected_date DESC, r.registration_id DESC`
    );

    const expired = expRows.map((r) => ({
      transaction_id: null,
      visitor_name: r.visitor_name,
      visitor_type: r.registration_type === 'Delivery' ? 'Delivery' : 'Visitor',
      purpose: r.purpose,
      plate_number: null,
      pass_number: null,
      entry_time: r.expected_date,   // gamitin ang expected_date para sa petsa
      exit_time: null,
      status: 'Expired',
      registration_id: r.registration_id,
      arrival_id: null,
      exit_note: null,
      exit_additional_note: null,
      resident_name: r.resident_name,
      unit_address: r.unit_address,
      registration_type: r.registration_type,
    }));

    res.json([...completed, ...expired]);
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
              t.exit_note, t.exit_additional_note,
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

// GET /api/entry/admin-summary  (Admin)
async function getAdminSummary(req, res) {
  try {
    const [[active]] = await pool.query(`SELECT COUNT(*) AS n FROM VisitorTransactions WHERE status = 'Active'`);
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
    let activeGates = 0;
    try {
      const [[g]] = await pool.query(
        `SELECT COUNT(DISTINCT gate_id) AS n FROM Guards
         WHERE gate_id IS NOT NULL AND (status = 'Active' OR status = 'On Duty' OR status = 'ON DUTY')`
      );
      activeGates = g.n;
    } catch (e) { activeGates = 0; }
    if (!activeGates) {
      try {
        const [[g2]] = await pool.query(`SELECT COUNT(DISTINCT gate_id) AS n FROM Guards WHERE gate_id IS NOT NULL`);
        activeGates = g2.n;
      } catch (e) { activeGates = 0; }
    }
    const [[total]] = await pool.query(`SELECT COUNT(*) AS n FROM VisitorTransactions`);

    // Total visitors ngayong linggo (Lunes–Linggo, nagre-reset tuwing Lunes)
    // WEEKDAY(): 0 = Monday. Simula ng linggo = today − WEEKDAY(today) days.
    const [[weekly]] = await pool.query(
      `SELECT COUNT(*) AS n FROM VisitorTransactions
       WHERE entry_time >= (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY)
         AND entry_time <  (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY) + INTERVAL 7 DAY`
    );

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
      stats: { activeVisitors: active.n, todayEntries: todayEntries.n, expectedToday: expected.n, activeGates, weeklyVisitors: weekly.n, total: total.n },
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
      // Expected singles na HINDI pa lipas (walang expired)
      const [rows] = await pool.query(
        `SELECT d.visitor_name, r.registration_id, r.purpose,
                res.resident_id, res.full_name AS resident_name, res.unit_address
         FROM VisitorRegistrations r
         JOIN VisitorRegistrationDetails d ON d.registration_id = r.registration_id
         JOIN Residents res ON res.resident_id = r.resident_id
         WHERE r.registration_type = 'Single' AND r.status = 'Expected'
           AND DATE(r.expected_date) >= CURDATE()`
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
       WHERE r.status = 'Active'
          OR (r.status = 'Expected' AND DATE(r.expected_date) >= CURDATE())
          OR (r.status = 'Departed' AND EXISTS (
                SELECT 1 FROM VisitorTransactions vt
                WHERE vt.registration_id = r.registration_id
                  AND DATE(vt.exit_time) = CURDATE()))
       ORDER BY r.registration_id DESC`
    );

    const result = [];
    for (const r of regs) {
      const [details] = await pool.query(`SELECT visitor_name FROM VisitorRegistrationDetails WHERE registration_id = ?`, [r.registration_id]);
      const [txs] = await pool.query(
        `SELECT visitor_name, status, entry_time, exit_time, arrival_id, transaction_id, pass_number
         FROM VisitorTransactions WHERE registration_id = ?`, [r.registration_id]
      );
      const txByName = {};
      for (const t of txs) txByName[(t.visitor_name || '').toUpperCase()] = t;

      const visitors = details.map((d) => {
        const t = txByName[(d.visitor_name || '').toUpperCase()];
        let status = 'EXPECTED', timeIn = null, timeOut = null, arrivalId = null, transactionId = null, passNumber = null;
        if (t) {
          transactionId = t.transaction_id; arrivalId = t.arrival_id; timeIn = t.entry_time; timeOut = t.exit_time;
          passNumber = t.pass_number;
          if (t.status === 'Active') status = 'ACTIVE';
          else if (t.status === 'Completed') status = 'DEPARTED';
        }
        return { name: d.visitor_name, status, timeIn, timeOut, arrivalId, transactionId, passNumber };
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
// Optional exit note: exitNote (one of the 4 choices) + exitAdditionalNote (free text). Both optional.
async function recordExit(req, res) {
  try {
    const { id } = req.params;
    const exitGuardId = req.user.guardId;
    const { exitNote, exitAdditionalNote } = req.body || {};

    const [rows] = await pool.query(
      `SELECT transaction_id, registration_id FROM VisitorTransactions WHERE transaction_id = ? AND status = 'Active'`, [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Active visitor not found.' });
    const regId = rows[0].registration_id;

    await pool.query(
      `UPDATE VisitorTransactions
       SET status = 'Completed', exit_time = NOW(), exit_guard_id = ?,
           exit_note = ?, exit_additional_note = ?
       WHERE transaction_id = ?`,
      [exitGuardId, exitNote || null, exitAdditionalNote || null, id]
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

// GET /api/entry/expire-check  (Admin/Guard) - markahan bilang Expired ang lumipas
async function expireOld(req, res) {
  try {
    const [result] = await pool.query(
      `UPDATE VisitorRegistrations SET status = 'Expired'
       WHERE status = 'Expected' AND DATE(expected_date) < CURDATE()`
    );
    res.json({ message: 'Expired registrations updated.', count: result.affectedRows });
  } catch (err) {
    res.status(500).json({ message: 'Error expiring registrations.', error: err.message });
  }
}

// GET /api/entry/expected-deliveries  (Guard)
// Mga resident lang na may naka-register na expected delivery NGAYONG LINGGO (Lunes–Linggo).
// Kasama ang Expected at Expired (para sa dating dumating sa ibang araw) — pero hindi Active/Departed.
async function getExpectedDeliveries(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.registration_id, r.purpose, r.status,
              DATE_FORMAT(r.expected_date, '%Y-%m-%d') AS expected_date,
              res.resident_id, res.full_name AS resident_name, res.unit_address
       FROM VisitorRegistrations r
       JOIN Residents res ON res.resident_id = r.resident_id
       WHERE r.registration_type = 'Delivery'
         AND r.status IN ('Expected', 'Expired')
         AND r.expected_date >= (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY)
         AND r.expected_date <  (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY) + INTERVAL 7 DAY
       ORDER BY r.expected_date DESC, r.registration_id DESC`
    );
    res.json(rows.map((r) => ({
      registrationId: r.registration_id,
      residentId: r.resident_id,
      name: r.resident_name,
      address: r.unit_address,
      purpose: r.purpose || 'Delivery',
      expectedDate: r.expected_date,
      status: r.status,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching expected deliveries.', error: err.message });
  }
}

// POST /api/entry/preview-pass  (Guard)
// I-preview ang mga pass number na i-a-assign kapag na-approve — WALANG insert.
// Ginagamit ang PAREHONG logic (kindOf + getFreePasses) tulad ng createGroupEntry,
// para tiyak na tugma ang ipinapakita sa confirm screen at ang aktwal na maiimbak.
async function previewPasses(req, res) {
  try {
    const { visitors } = req.body;
    if (!Array.isArray(visitors) || visitors.length === 0) {
      return res.json({ passes: [] });
    }
    const kindOf = (v) => (v.visitorType === 'Delivery' ? 'Delivery' : 'Visitor');
    const needV = visitors.filter((v) => kindOf(v) === 'Visitor').length;
    const needD = visitors.filter((v) => kindOf(v) === 'Delivery').length;

    // Walang transaction — read-only preview lang (pool.query ay sapat na para sa getFreePasses).
    const freeV = needV ? await getFreePasses(pool, 'Visitor', needV) : [];
    const freeD = needD ? await getFreePasses(pool, 'Delivery', needD) : [];

    let vi = 0, di = 0;
    const passes = visitors.map((v) => {
      const kind = kindOf(v);
      const num = kind === 'Delivery' ? freeD[di++] : freeV[vi++];
      return {
        visitorName: v.visitorName,
        visitorType: v.visitorType || 'Visitor',
        passNumber: (num != null) ? formatPass(kind, num) : null,
      };
    });
    res.json({ passes });
  } catch (err) {
    res.status(500).json({ message: 'Error previewing passes.', error: err.message });
  }
}

module.exports = {
  matchVisitor, createGroupEntry, getActiveVisitors, getHistory, getAllLogs, getAdminSummary,
  getResidentsForGuard, getCompanions, getSchedule, recordExit, expireOld, previewPasses,
  getExpectedDeliveries,
};
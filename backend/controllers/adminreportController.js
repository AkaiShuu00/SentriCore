const pool = require('../config/db');

// GET /api/admin/reports/monthly  (Admin)
// Nagbabalik ng current-month overview, last-5-months chart/table, at summary
async function monthlyReport(req, res) {
  try {
    // ── Current month overview ──
    const [[totalVisitors]] = await pool.query(
      `SELECT COUNT(*) AS n FROM VisitorTransactions
       WHERE visitor_type <> 'Delivery'
         AND entry_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND entry_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH`
    );
    const [[totalDeliveries]] = await pool.query(
      `SELECT COUNT(*) AS n FROM VisitorTransactions
       WHERE visitor_type = 'Delivery'
         AND entry_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND entry_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH`
    );
    // Peak day (araw na may pinakamaraming entries) ng kasalukuyang buwan
    const [peakRows] = await pool.query(
      `SELECT DATE(entry_time) AS d, COUNT(*) AS n FROM VisitorTransactions
       WHERE entry_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND entry_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH
       GROUP BY DATE(entry_time) ORDER BY n DESC LIMIT 1`
    );
    const peakDay = peakRows.length ? peakRows[0].d : null;
    const peakCount = peakRows.length ? peakRows[0].n : 0;

    // ── Last 5 months (kasama ang current) — chart + table ──
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const [[row]] = await pool.query(
        `SELECT
           DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%b') AS label,
           DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%M %Y') AS fullLabel,
           (SELECT COUNT(*) FROM VisitorTransactions
             WHERE visitor_type <> 'Delivery'
               AND entry_time >= DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%Y-%m-01')
               AND entry_time <  DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%Y-%m-01') + INTERVAL 1 MONTH) AS visitors,
           (SELECT COUNT(*) FROM VisitorTransactions
             WHERE visitor_type = 'Delivery'
               AND entry_time >= DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%Y-%m-01')
               AND entry_time <  DATE_FORMAT(CURDATE() - INTERVAL ? MONTH, '%Y-%m-01') + INTERVAL 1 MONTH) AS deliveries`,
        [i, i, i, i, i, i]
      );
      months.push({
        label: row.label,
        fullLabel: (row.fullLabel || '').toUpperCase(),
        visitors: row.visitors,
        deliveries: row.deliveries,
        total: row.visitors + row.deliveries,
      });
    }

    // ── Exit Note observations (current month) — counts per category from DB ──
    const [noteRows] = await pool.query(
      `SELECT exit_note AS note, COUNT(*) AS n
       FROM VisitorTransactions
       WHERE status = 'Completed' AND exit_note IS NOT NULL AND exit_note <> ''
         AND exit_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND exit_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH
       GROUP BY exit_note`
    );
    const exitNoteCounts = { 'No Problem': 0, 'Small Issue': 0, 'Security Concern': 0, 'Incident Happened': 0 };
    for (const r of noteRows) {
      if (Object.prototype.hasOwnProperty.call(exitNoteCounts, r.note)) exitNoteCounts[r.note] = Number(r.n);
    }
    // Recent flagged observations (concerns/incidents) with any additional detail
    const [flagged] = await pool.query(
      `SELECT t.visitor_name, t.exit_note, t.exit_additional_note, t.exit_time,
              res.full_name AS resident_name, res.unit_address
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       WHERE t.status = 'Completed'
         AND t.exit_note IN ('Security Concern','Incident Happened')
         AND t.exit_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND t.exit_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH
       ORDER BY t.exit_time DESC LIMIT 20`
    );
    const exitNotes = {
      counts: exitNoteCounts,
      totalLogged: Object.values(exitNoteCounts).reduce((a, b) => a + b, 0),
      flagged: flagged.map((f) => ({
        visitor: f.visitor_name,
        resident: f.resident_name,
        unit: f.unit_address,
        note: f.exit_note,
        detail: f.exit_additional_note || '',
        time: f.exit_time,
      })),
    };

    // ── Summary highlights (current month) ──
    const prev = months[months.length - 2];
    const curr = months[months.length - 1];
    const pct = prev && prev.visitors > 0
      ? (((curr.visitors - prev.visitors) / prev.visitors) * 100).toFixed(1)
      : null;
    const daysElapsed = new Date().getDate();
    const avgDaily = daysElapsed > 0 ? Math.round(curr.visitors / daysElapsed) : 0;

    res.json({
      overview: {
        totalVisitors: totalVisitors.n,
        totalDeliveries: totalDeliveries.n,
        peakDay,
        peakCount,
        monthLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
      chart: months,       // last 5 months (nagmu-move)
      table: [...months].reverse(),  // pinaka-bago sa taas
      exitNotes,           // exit-note observation counts + flagged list (current month)
      summary: {
        totalVisitors: curr.visitors,
        totalDeliveries: curr.deliveries,
        pctVsPrev: pct,
        peakDay,
        peakCount,
        avgDaily,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report.', error: err.message });
  }
}

// GET /api/admin/reports/recurrent  (Admin)
// Frequent visitors (by name), YTD visits + this-month visits, resident, type
async function recurrentReport(req, res) {
  try {
    // Group by visitor_name — YTD (current year) at this-month counts
    const [rows] = await pool.query(
      `SELECT t.visitor_name,
              MAX(t.visitor_type) AS visitor_type,
              MAX(res.full_name) AS resident_name,
              CASE WHEN COUNT(DISTINCT res.resident_id) > 1 THEN 'Multiple'
                   ELSE MAX(res.unit_address) END AS unit,
              SUM(CASE WHEN YEAR(t.entry_time) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS ytd,
              SUM(CASE WHEN t.entry_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
                        AND t.entry_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH
                       THEN 1 ELSE 0 END) AS this_month
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       GROUP BY t.visitor_name
       HAVING ytd > 0
       ORDER BY ytd DESC
       LIMIT 50`
    );

    const list = rows.map((r) => ({
      name: r.visitor_name,
      resident: r.resident_name || '',
      type: r.visitor_type || 'Visitor',
      unit: r.unit || '—',
      ytd: Number(r.ytd),
      thisMonth: Number(r.this_month),
    }));

    // Summary
    const top = list[0] || null;
    const FREQUENT_THRESHOLD = 10; // YTD visits para maituring na "frequent"
    const frequentCount = list.filter((r) => r.ytd >= FREQUENT_THRESHOLD).length;
    // Anong type ang dominant sa top 3
    const top3 = list.slice(0, 3);
    const typeCounts = {};
    top3.forEach((r) => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    res.json({
      list,
      summary: {
        topName: top ? top.name : '—',
        topYtd: top ? top.ytd : 0,
        topThisMonth: top ? top.thisMonth : 0,
        frequentCount,
        dominantType: dominantType ? dominantType[0] : '—',
        monthLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating recurrent report.', error: err.message });
  }
}

// GET /api/admin/reports/audit  (Admin)
// Audit trail — sino-ang-gumawa-ng-ano-at-kailan.
// Pangunahing galaw ng GUARD (entry/exit) mula sa VisitorTransactions,
// dagdag ang login/account events mula sa AuditLogs kung available.
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: kasalukuyang buwan).
async function auditReport(req, res) {
  try {
    // ── Date window (default: current month) ──
    const from = req.query.from
      ? `${req.query.from} 00:00:00`
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10) + ' 00:00:00';
    const to = req.query.to
      ? `${req.query.to} 23:59:59`
      : new Date().toISOString().slice(0, 10) + ' 23:59:59';

    const rows = [];

    // 1) ENTRY recorded by guard
    const [entries] = await pool.query(
      `SELECT t.entry_time AS ts, g.full_name AS actor,
              t.visitor_name, t.visitor_type, res.full_name AS resident_name, res.unit_address
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       LEFT JOIN Guards g ON g.guard_id = t.guard_id
       WHERE t.entry_time BETWEEN ? AND ?`,
      [from, to]
    );
    for (const e of entries) {
      rows.push({
        ts: e.ts,
        actor: e.actor || 'Unknown guard',
        role: 'Guard',
        action: 'Recorded Entry',
        details: `${e.visitor_type || 'Visitor'}: ${e.visitor_name} → ${e.resident_name}${e.unit_address ? ` (${e.unit_address})` : ''}`,
      });
    }

    // 2) EXIT recorded by guard
    const [exits] = await pool.query(
      `SELECT t.exit_time AS ts, g.full_name AS actor,
              t.visitor_name, t.exit_note
       FROM VisitorTransactions t
       LEFT JOIN Guards g ON g.guard_id = t.exit_guard_id
       WHERE t.status = 'Completed' AND t.exit_time BETWEEN ? AND ?`,
      [from, to]
    );
    for (const x of exits) {
      rows.push({
        ts: x.ts,
        actor: x.actor || 'Unknown guard',
        role: 'Guard',
        action: 'Recorded Exit',
        details: `Visitor: ${x.visitor_name}${x.exit_note ? ` — Note: ${x.exit_note}` : ''}`,
      });
    }

    // 3) Login / account events mula sa AuditLogs (optional — hindi lahat ng DB ay pareho)
    try {
      const [logs] = await pool.query(
        `SELECT a.created_at AS ts, COALESCE(u.username, 'System') AS actor,
                COALESCE(r.role_name, '—') AS role, a.action AS action, a.description AS details
         FROM AuditLogs a
         LEFT JOIN Users u ON u.user_id = a.user_id
         LEFT JOIN Roles r ON r.role_id = u.role_id
         WHERE a.created_at BETWEEN ? AND ?`,
        [from, to]
      );
      for (const l of logs) {
        rows.push({ ts: l.ts, actor: l.actor, role: l.role, action: l.action, details: l.details || '' });
      }
    } catch (e) {
      console.warn('AuditLogs skipped (table/columns not found):', e.message);
    }

    // Sort newest-first, cap para hindi bumigat
    rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const list = rows.slice(0, 300);

    // Summary
    const summary = {
      total: rows.length,
      entries: entries.length,
      exits: exits.length,
      logins: rows.filter((r) => (r.action || '').toLowerCase().includes('login')).length,
      activeGuards: new Set(
        rows.filter((r) => r.role === 'Guard' && r.actor).map((r) => r.actor)
      ).size,
      monthLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      from: from.slice(0, 10),
      to: to.slice(0, 10),
    };

    res.json({ list, summary });
  } catch (err) {
    res.status(500).json({ message: 'Error generating audit report.', error: err.message });
  }
}

module.exports = { monthlyReport, recurrentReport, auditReport };
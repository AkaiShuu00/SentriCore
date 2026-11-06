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
    const [peakRows] = await pool.query(
      `SELECT DATE(entry_time) AS d, COUNT(*) AS n FROM VisitorTransactions
       WHERE entry_time >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND entry_time <  DATE_FORMAT(CURDATE(),'%Y-%m-01') + INTERVAL 1 MONTH
       GROUP BY DATE(entry_time) ORDER BY n DESC LIMIT 1`
    );
    const peakDay = peakRows.length ? peakRows[0].d : null;
    const peakCount = peakRows.length ? peakRows[0].n : 0;

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
      chart: months,
      table: [...months].reverse(),
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
async function recurrentReport(req, res) {
  try {
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

    const top = list[0] || null;
    const FREQUENT_THRESHOLD = 10;
    const frequentCount = list.filter((r) => r.ytd >= FREQUENT_THRESHOLD).length;
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
// Audit trail — konektado sa dashboard Recent Activity (entries/exits) + REPORTS
// (guard reports + resident complaints). Total Records = entries + exits + reports.
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: kasalukuyang buwan).
async function auditReport(req, res) {
  try {
    const from = req.query.from
      ? `${req.query.from} 00:00:00`
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10) + ' 00:00:00';
    const to = req.query.to
      ? `${req.query.to} 23:59:59`
      : new Date().toISOString().slice(0, 10) + ' 23:59:59';

    const rows = [];

    // 1) ENTRY recorded by guard (= ang lumalabas sa Recent Activity na "entered")
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

    // 2) EXIT recorded by guard (= ang "exited" sa Recent Activity)
    const [exits] = await pool.query(
      `SELECT t.exit_time AS ts, g.full_name AS actor, t.visitor_name
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
        details: `Visitor: ${x.visitor_name}`,
      });
    }

    // 3) REPORTS — guard reports (incident monitoring)
    let reportCount = 0;
    try {
      const [greports] = await pool.query(
        `SELECT gr.created_at AS ts, g.full_name AS actor, gr.category, gr.report_type, gr.location
         FROM GuardReports gr
         LEFT JOIN Guards g ON g.guard_id = gr.guard_id
         WHERE gr.created_at BETWEEN ? AND ?`,
        [from, to]
      );
      for (const r of greports) {
        rows.push({
          ts: r.ts,
          actor: r.actor || 'Guard',
          role: 'Guard',
          action: 'Filed Report',
          details: `${r.category}: ${r.report_type}${r.location ? ` @ ${r.location}` : ''}`,
        });
      }
      reportCount += greports.length;
    } catch (e) { console.warn('GuardReports skipped:', e.message); }

    // 3b) REPORTS — resident complaints
    try {
      const [complaints] = await pool.query(
        `SELECT c.created_at AS ts, res.full_name AS actor, c.category, c.subject, c.status
         FROM Complaints c
         LEFT JOIN Residents res ON res.resident_id = c.resident_id
         WHERE c.created_at BETWEEN ? AND ?`,
        [from, to]
      );
      for (const c of complaints) {
        rows.push({
          ts: c.ts,
          actor: c.actor || 'Resident',
          role: 'Resident',
          action: 'Filed Complaint',
          details: `${c.category}: ${c.subject} (${c.status})`,
        });
      }
      reportCount += complaints.length;
    } catch (e) { console.warn('Complaints skipped:', e.message); }

    // Sort newest-first, cap
    rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const list = rows.slice(0, 400);

    const summary = {
      total: rows.length,                // = entries + exits + reports
      entries: entries.length,
      exits: exits.length,
      reports: reportCount,              // guard reports + complaints
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
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

module.exports = { monthlyReport, recurrentReport };
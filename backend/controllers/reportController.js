const pool = require('../config/db');

// GET /api/reports/summary  (Admin) - overall dashboard numbers
async function getSummary(req, res) {
  try {
    const [[residents]] = await pool.query(`SELECT COUNT(*) AS total FROM Residents`);
    const [[guards]] = await pool.query(`SELECT COUNT(*) AS total FROM Guards WHERE status = 'Active'`);
    const [[activeNow]] = await pool.query(`SELECT COUNT(*) AS total FROM VisitorTransactions WHERE status = 'Active'`);
    const [[todayEntries]] = await pool.query(
      `SELECT COUNT(*) AS total FROM VisitorTransactions WHERE DATE(entry_time) = CURDATE()`
    );
    const [[expectedToday]] = await pool.query(
      `SELECT COUNT(*) AS total FROM VisitorRegistrations WHERE expected_date = CURDATE() AND status = 'Expected'`
    );
    const [[blocked]] = await pool.query(`SELECT COUNT(*) AS total FROM BlockList`);

    res.json({
      totalResidents: residents.total,
      activeGuards: guards.total,
      activeVisitorsNow: activeNow.total,
      todayEntries: todayEntries.total,
      expectedToday: expectedToday.total,
      blockedPersons: blocked.total
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
}

// GET /api/reports/monthly?year=&month=  (Admin) - monthly visitor report
async function getMonthlyReport(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    // Totals by visitor type
    const [byType] = await pool.query(
      `SELECT visitor_type, COUNT(*) AS total
       FROM VisitorTransactions
       WHERE YEAR(entry_time) = ? AND MONTH(entry_time) = ?
       GROUP BY visitor_type`,
      [year, month]
    );

    // Daily entry counts
    const [daily] = await pool.query(
      `SELECT DATE(entry_time) AS date, COUNT(*) AS total
       FROM VisitorTransactions
       WHERE YEAR(entry_time) = ? AND MONTH(entry_time) = ?
       GROUP BY DATE(entry_time)
       ORDER BY date`,
      [year, month]
    );

    // Grand total
    const [[grand]] = await pool.query(
      `SELECT COUNT(*) AS total FROM VisitorTransactions
       WHERE YEAR(entry_time) = ? AND MONTH(entry_time) = ?`,
      [year, month]
    );

    res.json({ year, month, totalVisitors: grand.total, byType, daily });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching monthly report.', error: err.message });
  }
}

// GET /api/reports/log  (Admin) - full community log (all transactions)
async function getFullLog(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaction_id, t.visitor_name, t.visitor_type, t.status,
              t.pass_number, t.entry_time, t.exit_time, res.full_name AS resident_name
       FROM VisitorTransactions t
       JOIN Residents res ON res.resident_id = t.resident_id
       ORDER BY t.transaction_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching log.', error: err.message });
  }
}

module.exports = { getSummary, getMonthlyReport, getFullLog };
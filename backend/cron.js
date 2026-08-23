const cron = require('node-cron');
const pool = require('./config/db');

// Runs every day at 00:01 — marks Expected registrations as Expired
// if their expected date has passed with no gate activity.
function startCronJobs() {
  cron.schedule('1 0 * * *', async () => {
    try {
      const [result] = await pool.query(
        `UPDATE VisitorRegistrations
         SET status = 'Expired'
         WHERE status = 'Expected'
           AND expected_date < CURDATE()
           AND registration_id NOT IN (
             SELECT DISTINCT registration_id FROM VisitorTransactions
             WHERE registration_id IS NOT NULL
           )`
      );
      console.log(`🕛 Expired auto-mark: ${result.affectedRows} registration(s) marked as Expired.`);
    } catch (err) {
      console.error('❌ Expired auto-mark failed:', err.message);
    }
  });

  console.log('⏰ Cron jobs scheduled.');
}

module.exports = { startCronJobs };
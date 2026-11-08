// backend/routes/guardreports.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createGuardReport, getMyGuardReports, getAdminGuardReports, acknowledgeGuardReport,
  resolveGuardReport, reopenGuardReport,
} = require('../controllers/guardreportController');

// ── Guard ──
router.post('/guard-reports', verifyToken, requireRole('Guard'), createGuardReport);
router.get('/guard-reports/mine', verifyToken, requireRole('Guard'), getMyGuardReports);
// Guard LANG ang makaka-mark Resolved, o mag-re-submit (thread) — parang resident complaints
router.put('/guard-reports/:id/resolve', verifyToken, requireRole('Guard'), resolveGuardReport);
router.put('/guard-reports/:id/reopen',  verifyToken, requireRole('Guard'), reopenGuardReport);

// ── Admin (Incident Monitoring) ──
router.get('/admin/guard-reports', verifyToken, requireRole('Admin'), getAdminGuardReports);
router.put('/admin/guard-reports/:id', verifyToken, requireRole('Admin'), acknowledgeGuardReport);

module.exports = router;

// ⚠️ Sa index.js / server.js:
//   const guardReportRoutes = require('./routes/guardreports');
//   app.use('/api', guardReportRoutes);
// backend/routes/guardReports.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createGuardReport, getMyGuardReports, getAdminGuardReports, acknowledgeGuardReport,
} = require('../controllers/guardreportController');

// ── Guard ──
router.post('/guard-reports', verifyToken, requireRole('Guard'), createGuardReport);
router.get('/guard-reports/mine', verifyToken, requireRole('Guard'), getMyGuardReports);

// ── Admin (Incident Monitoring) ──
router.get('/admin/guard-reports', verifyToken, requireRole('Admin'), getAdminGuardReports);
router.put('/admin/guard-reports/:id', verifyToken, requireRole('Admin'), acknowledgeGuardReport);

module.exports = router;

// ⚠️ Sa index.js / server.js:
//   const guardReportRoutes = require('./routes/guardReports');
//   app.use('/api', guardReportRoutes);
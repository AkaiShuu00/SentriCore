// backend/routes/adminReports.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { monthlyReport, recurrentReport, auditReport } = require('../controllers/adminreportController');

router.get('/reports/monthly', verifyToken, requireRole('Admin'), monthlyReport);
router.get('/reports/recurrent', verifyToken, requireRole('Admin'), recurrentReport);
router.get('/reports/audit', verifyToken, requireRole('Admin'), auditReport);

module.exports = router;

// ⚠️ Sa index.js:
//   const adminReportRoutes = require('./routes/adminReports');
//   app.use('/api/admin', adminReportRoutes);
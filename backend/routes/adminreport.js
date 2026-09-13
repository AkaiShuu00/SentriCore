// backend/routes/adminReports.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { monthlyReport, recurrentReport } = require('../controllers/adminReportController');

router.get('/reports/monthly', verifyToken, requireRole('Admin'), monthlyReport);
router.get('/reports/recurrent', verifyToken, requireRole('Admin'), recurrentReport);

module.exports = router;

// ⚠️ Sa index.js:
//   const adminReportRoutes = require('./routes/adminReports');
//   app.use('/api/admin', adminReportRoutes);
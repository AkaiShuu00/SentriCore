const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getSummary, getMonthlyReport, getFullLog } = require('../controllers/reportController');

// Admin-only reports
router.get('/summary', verifyToken, requireRole('Admin'), getSummary);
router.get('/monthly', verifyToken, requireRole('Admin'), getMonthlyReport);
router.get('/log', verifyToken, requireRole('Admin'), getFullLog);

module.exports = router;
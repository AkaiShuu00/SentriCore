const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');

// Admin-only
router.get('/', verifyToken, requireRole('Admin'), getAuditLogs);

module.exports = router;
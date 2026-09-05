const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  matchVisitor,
  createGroupEntry,
  getActiveVisitors,
  getHistory,
  recordExit,
  getResidentsForGuard,
  getCompanions,
  getSchedule
} = require('../controllers/entryController');

// All entry routes are guard-only
router.get('/match', verifyToken, requireRole('Guard'), matchVisitor);
router.get('/active', verifyToken, requireRole('Guard'), getActiveVisitors);
router.get('/history', verifyToken, requireRole('Guard'), getHistory);
router.get('/residents', verifyToken, requireRole('Guard'), getResidentsForGuard);
router.get('/companions', verifyToken, requireRole('Guard'), getCompanions);
router.get('/schedule', verifyToken, requireRole('Guard'), getSchedule);
router.post('/group', verifyToken, requireRole('Guard'), createGroupEntry);
router.post('/:id/exit', verifyToken, requireRole('Guard'), recordExit);

module.exports = router;
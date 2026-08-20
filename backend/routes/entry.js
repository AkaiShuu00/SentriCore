const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  matchVisitor,
  createGroupEntry,
  getActiveVisitors,
  recordExit
} = require('../controllers/entryController');

// All entry routes are guard-only
router.get('/match', verifyToken, requireRole('Guard'), matchVisitor);
router.get('/active', verifyToken, requireRole('Guard'), getActiveVisitors);
router.post('/group', verifyToken, requireRole('Guard'), createGroupEntry);
router.post('/:id/exit', verifyToken, requireRole('Guard'), recordExit);

module.exports = router;
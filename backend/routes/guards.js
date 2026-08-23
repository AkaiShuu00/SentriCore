const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getGuards,
  createGuard,
  updateGuard,
  getMyProfile,
  getOnDutyGuards
} = require('../controllers/guardController');

// Guard's own profile
router.get('/me', verifyToken, requireRole('Guard'), getMyProfile);

// On-duty guards (for resident's "Contact Guard")
router.get('/on-duty', verifyToken, getOnDutyGuards);

// Admin-only management
router.get('/', verifyToken, requireRole('Admin'), getGuards);
router.post('/', verifyToken, requireRole('Admin'), createGuard);
router.put('/:id', verifyToken, requireRole('Admin'), updateGuard);

module.exports = router;
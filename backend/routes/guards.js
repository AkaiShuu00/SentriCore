const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getGuards,
  createGuard,
  updateGuard,
  getMyProfile,
  getOnDutyGuards,
  getGuardDirectory,
  getMyShift,
  endShift,
  getGuardShifts,
} = require('../controllers/guardController');

// Guard's own profile
router.get('/me', verifyToken, requireRole('Guard'), getMyProfile);

// Guard shift (time-in/out)
router.get('/my-shift', verifyToken, requireRole('Guard'), getMyShift);
router.post('/end-shift', verifyToken, requireRole('Guard'), endShift);

// Admin: guard time-in/out records
router.get('/shifts', verifyToken, requireRole('Admin'), getGuardShifts);

// On-duty guards (for resident's "Contact Guard")
router.get('/on-duty', verifyToken, getOnDutyGuards);

// FULL guard directory + status (resident Contact Guard screen)
router.get('/directory', verifyToken, getGuardDirectory);

// Admin-only management
router.get('/', verifyToken, requireRole('Admin'), getGuards);
router.post('/', verifyToken, requireRole('Admin'), createGuard);
router.put('/:id', verifyToken, requireRole('Admin'), updateGuard);

module.exports = router;
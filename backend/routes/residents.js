const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getResidents,
  createResident,
  updateResident,
  deactivateResident,
  getMyProfile
} = require('../controllers/residentController');

// Resident's own profile
router.get('/me', verifyToken, requireRole('Resident'), getMyProfile);

// Admin-only management
router.get('/', verifyToken, requireRole('Admin'), getResidents);
router.post('/', verifyToken, requireRole('Admin'), createResident);
router.put('/:id', verifyToken, requireRole('Admin'), updateResident);
router.delete('/:id', verifyToken, requireRole('Admin'), deactivateResident);

module.exports = router;
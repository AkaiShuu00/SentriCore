const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listResidents, residentActiveVisitors, addResident, updateResident, resetResidentPassword,
} = require('../controllers/adminResidentController');

router.get('/residents', verifyToken, requireRole('Admin'), listResidents);
router.get('/residents/:id/active', verifyToken, requireRole('Admin'), residentActiveVisitors);
router.post('/residents', verifyToken, requireRole('Admin'), addResident);
router.put('/residents/:id', verifyToken, requireRole('Admin'), updateResident);
router.post('/residents/:id/reset-password', verifyToken, requireRole('Admin'), resetResidentPassword);

module.exports = router;


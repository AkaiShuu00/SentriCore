const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listGuards, guardActivity, addGuard, updateGuard, assignGate, resetGuardPassword, deleteGuard,
} = require('../controllers/adminguardController');

router.get('/guards', verifyToken, requireRole('Admin'), listGuards);
router.get('/guards/activity', verifyToken, requireRole('Admin'), guardActivity);
router.post('/guards', verifyToken, requireRole('Admin'), addGuard);
router.put('/guards/:id', verifyToken, requireRole('Admin'), updateGuard);
router.post('/guards/:id/assign', verifyToken, requireRole('Admin'), assignGate);
router.post('/guards/:id/reset-password', verifyToken, requireRole('Admin'), resetGuardPassword);
router.delete('/guards/:id', verifyToken, requireRole('Admin'), deleteGuard);

module.exports = router;

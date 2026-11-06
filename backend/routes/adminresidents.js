// backend/routes/adminResidents.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listResidents, residentActiveVisitors, addResident, updateResident, resetResidentPassword,
  deleteResident, listDeactivatedResidents, residentTransactions,
} = require('../controllers/adminResidentController');

// IMPORTANTE: ilagay ang mga SPECIFIC na path bago ang param routes (/:id),
// para hindi ma-shadow ang "/residents/deactivated".
router.get('/residents', verifyToken, requireRole('Admin'), listResidents);
router.get('/residents/deactivated', verifyToken, requireRole('Admin'), listDeactivatedResidents);
router.get('/residents/:id/active', verifyToken, requireRole('Admin'), residentActiveVisitors);
router.get('/residents/:id/transactions', verifyToken, requireRole('Admin'), residentTransactions);
router.post('/residents', verifyToken, requireRole('Admin'), addResident);
router.put('/residents/:id', verifyToken, requireRole('Admin'), updateResident);
router.post('/residents/:id/reset-password', verifyToken, requireRole('Admin'), resetResidentPassword);
// #1 — delete (o auto-deactivate kung may naka-link na records)
router.delete('/residents/:id', verifyToken, requireRole('Admin'), deleteResident);

module.exports = router;

// ⚠️ Sa server.js / index.js (dapat naka-mount sa /api/admin):
//   const adminResidentRoutes = require('./routes/adminResidents');
//   app.use('/api/admin', adminResidentRoutes);
// backend/routes/complaints.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createComplaint, getMyComplaints, getAllComplaints, resolveComplaint,
} = require('../controllers/complaintController');

// ── Resident ──
router.post('/complaints', verifyToken, requireRole('Resident'), createComplaint);
router.get('/complaints/mine', verifyToken, requireRole('Resident'), getMyComplaints);

// ── Admin ──
router.get('/admin/complaints', verifyToken, requireRole('Admin'), getAllComplaints);
router.put('/admin/complaints/:id', verifyToken, requireRole('Admin'), resolveComplaint);

module.exports = router;

// ⚠️ Sa server.js / index.js:
//   const complaintRoutes = require('./routes/complaints');
//   app.use('/api', complaintRoutes);
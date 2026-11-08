// backend/routes/complaints.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createComplaint, getMyComplaints, getAllComplaints, resolveComplaint,
  residentResolveComplaint, reopenComplaint, deleteComplaint,
} = require('../controllers/complaintController');

// ── Resident ──
router.post('/complaints', verifyToken, requireRole('Resident'), createComplaint);
router.get('/complaints/mine', verifyToken, requireRole('Resident'), getMyComplaints);
// Resident LANG ang makaka-mark ng Resolved, o mag-re-submit (thread)
router.put('/complaints/:id/resolve', verifyToken, requireRole('Resident'), residentResolveComplaint);
router.put('/complaints/:id/reopen',  verifyToken, requireRole('Resident'), reopenComplaint);
// Delete — habang Pending LANG (hindi pa na-acknowledge ng admin)
router.delete('/complaints/:id', verifyToken, requireRole('Resident'), deleteComplaint);

// ── Admin ──
router.get('/admin/complaints', verifyToken, requireRole('Admin'), getAllComplaints);
router.put('/admin/complaints/:id', verifyToken, requireRole('Admin'), resolveComplaint);

module.exports = router;

// ⚠️ Sa server.js / index.js:
//   const complaintRoutes = require('./routes/complaints');
//   app.use('/api', complaintRoutes);
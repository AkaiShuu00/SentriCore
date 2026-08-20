const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

// Any logged-in user can view announcements (visible by default on dashboards)
router.get('/', verifyToken, getAnnouncements);

// Admin-only management
router.post('/', verifyToken, requireRole('Admin'), createAnnouncement);
router.put('/:id', verifyToken, requireRole('Admin'), updateAnnouncement);
router.delete('/:id', verifyToken, requireRole('Admin'), deleteAnnouncement);

module.exports = router;
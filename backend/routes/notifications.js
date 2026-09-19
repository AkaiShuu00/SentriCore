// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getMyNotifications, markRead, markAllRead } = require('../controllers/notificationController');

router.get('/notifications', verifyToken, getMyNotifications);
router.put('/notifications/read-all', verifyToken, markAllRead);
router.put('/notifications/:id/read', verifyToken, markRead);

module.exports = router;

// ⚠️ Sa index.js:
//   const notificationRoutes = require('./routes/notifications');
//   app.use('/api', notificationRoutes);
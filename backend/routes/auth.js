const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { login, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', login);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;


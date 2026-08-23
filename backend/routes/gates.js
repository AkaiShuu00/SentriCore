const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getGates, createGate, updateGate, deleteGate } = require('../controllers/gateController');

// Any logged-in user can view gates
router.get('/', verifyToken, getGates);

// Admin-only management
router.post('/', verifyToken, requireRole('Admin'), createGate);
router.put('/:id', verifyToken, requireRole('Admin'), updateGate);
router.delete('/:id', verifyToken, requireRole('Admin'), deleteGate);

module.exports = router;
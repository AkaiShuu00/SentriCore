const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyPickup, getWaitingPickups, resolvePickup, myPickup } = require('../controllers/gatepickupcontroller');

// Resident: notify gate + tingnan ang sariling waiting
router.post('/', verifyToken, requireRole('Resident'), notifyPickup);
router.get('/mine', verifyToken, requireRole('Resident'), myPickup);

// Guard: listahan ng naghihintay + markahan tapos na
router.get('/', verifyToken, requireRole('Guard'), getWaitingPickups);
router.put('/:id/done', verifyToken, requireRole('Guard'), resolvePickup);

module.exports = router;
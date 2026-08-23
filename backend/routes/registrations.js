const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createRegistration,
  getMyRegistrations,
  updateRegistration,
  deleteRegistration
} = require('../controllers/registrationController');

// All registration routes are resident-only
router.post('/', verifyToken, requireRole('Resident'), createRegistration);
router.get('/', verifyToken, requireRole('Resident'), getMyRegistrations);
router.put('/:id', verifyToken, requireRole('Resident'), updateRegistration);
router.delete('/:id', verifyToken, requireRole('Resident'), deleteRegistration);

module.exports = router;
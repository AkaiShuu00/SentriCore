const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  addToBlocklist,
  getMyBlocklist,
  removeFromBlocklist,
  checkBlocklist
} = require('../controllers/blocklistController');

// Guard checks if a visitor is blocked
router.get('/check', verifyToken, requireRole('Guard'), checkBlocklist);

// Resident manages their own block list
router.post('/', verifyToken, requireRole('Resident'), addToBlocklist);
router.get('/', verifyToken, requireRole('Resident'), getMyBlocklist);
router.delete('/:id', verifyToken, requireRole('Resident'), removeFromBlocklist);

module.exports = router;
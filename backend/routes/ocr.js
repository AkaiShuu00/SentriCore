const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken, requireRole } = require('../middleware/auth');
const { scanId } = require('../controllers/ocrController');

// Store the image in MEMORY only — never written to disk (data privacy)
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ocr/scan
router.post('/scan', verifyToken, requireRole('Guard'), upload.single('file'), scanId);

module.exports = router;
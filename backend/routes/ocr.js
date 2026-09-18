// routes/ocr.js
const express = require('express');
const multer = require('multer');
const { scanId } = require('../controllers/ocrController');

// OPTIONAL auth — kung gusto mong guard/admin lang ang makascan, i-uncomment:
// const { verifyToken, requireRole } = require('../middleware/auth');

// In-memory (walang naiistore sa disk) — nagbibigay ng req.file.buffer para sa controller.
// 15MB limit; sapat na para sa resized na ID photo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = express.Router();

// POST /api/ocr/scan  → field name DAPAT 'file' (tugma sa frontend at controller)
router.post('/scan', upload.single('file'), scanId);
// Kung may auth:
// router.post('/scan', verifyToken, requireRole('Guard', 'Admin'), upload.single('file'), scanId);

module.exports = router;
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// POST /api/ocr/scan (Guard) - forward ID image to Python OCR, return name only
async function scanId(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }

    // Build multipart form to send the image buffer to the Python service
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'id.jpg',
      contentType: req.file.mimetype,
    });

    const ocrUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000/ocr';
    const response = await axios.post(ocrUrl, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
    });

    // Python returns { success, suggestedName, allLines }.
    // The image is NEVER stored — only the extracted name is used (data privacy).
    res.json(response.data);
  } catch (err) {
    console.error('OCR scan error:', err.message);
    res.status(500).json({ success: false, message: 'OCR service error.', error: err.message });
  }
}

module.exports = { scanId };
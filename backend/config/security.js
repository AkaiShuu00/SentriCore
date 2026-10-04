// config/security.js
// SentriCore security middleware — brute-force protection, security headers,
// at request-size limits. I-import ito sa index.js (tingnan ang guide sa ibaba).
//
// Install muna (sa backend folder):
//   npm install helmet express-rate-limit
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Configurable via .env (may safe defaults kung wala)
const WINDOW_MIN = parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10);
const LOGIN_MAX = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10);
const OTP_MAX = parseInt(process.env.OTP_MAX_REQUESTS || '5', 10);
const API_MAX = parseInt(process.env.API_MAX_REQUESTS || '300', 10);
const WIN = WINDOW_MIN * 60 * 1000;

// 1) SECURITY HEADERS (Helmet) — nagdadagdag ng HTTP headers laban sa
//    clickjacking, MIME-sniffing, atbp. crossOriginResourcePolicy off para
//    hindi ma-block ang logo/API mula sa ibang origin (React SPA).
const securityHeaders = helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // SPA-friendly; naka-off para hindi masira ang inline assets
});

// 2) LOGIN RATE LIMIT — max 10 tries kada 15 min bawat IP (anti brute-force).
const loginLimiter = rateLimit({
  windowMs: WIN,
  max: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: `Too many login attempts. Please try again after ${WINDOW_MIN} minutes.` },
});

// 3) FORGOT-PASSWORD / OTP RATE LIMIT — max 5 requests kada 15 min bawat IP
//    (iwas sa pag-spam ng OTP email at pag-guess ng code).
const otpLimiter = rateLimit({
  windowMs: WIN,
  max: OTP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// 4) GLOBAL API LIMIT — bantay sa abuse (mataas para hindi makaistorbo sa normal use).
const apiLimiter = rateLimit({
  windowMs: WIN,
  max: API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

module.exports = { securityHeaders, loginLimiter, otpLimiter, apiLimiter };
// backend/config/mailer.js
const nodemailer = require('nodemailer');

// Gmail SMTP via App Password (libre). Sa .env:
//   SMTP_USER=youraddress@gmail.com
//   SMTP_PASS=your-16-char-app-password   (Google Account → Security → App passwords)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail(to, subject, text) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] Walang SMTP_USER/SMTP_PASS sa .env — hindi naipadala ang email.');
    return false;
  }
  await transporter.sendMail({
    from: `"SentriCore" <${process.env.SMTP_USER}>`,
    to, subject, text,
  });
  return true;
}

module.exports = { sendMail };
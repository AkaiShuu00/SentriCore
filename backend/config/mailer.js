// config/mailer.js
// SentriCore automated email sender (Gmail SMTP via App Password).
// Nag-e-export ng:
//   - sendMail(to, subject, text)                 → generic plain-text (luma, pinapanatili)
//   - sendOtpEmail(to, code, name)                → branded OTP "Verify your email" (white, malinis)
//   - sendAccountEmail(to, username, password, name) → account welcome (white, malinis)
// Lahat ng creds ay galing sa .env (SMTP_USER, SMTP_PASS). Walang hardcoded.
const nodemailer = require('nodemailer');
require('dotenv').config();

const OTP_EXP_MINUTES = parseInt(process.env.OTP_EXP_MINUTES || '10', 10);
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://sentricore.koreacentral.cloudapp.azure.com';
const SMTP_USER = process.env.SMTP_USER;
// Alisin ang spaces sa Gmail App Password para sigurado (iwas typo).
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

// From: malinis na display name. ReplyTo: TOTOONG address (iwas spam — dating
// no-reply@sentricore ay invalid domain at nagpapadala sa spam).
const FROM = `"SentriCore" <${SMTP_USER}>`;
const REPLY_TO = SMTP_USER;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ───────────────────────── Shared layout (white, malinis) ─────────────────────────
const LOGO = `${APP_BASE_URL}/logo.png`;
function wrap(innerHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#ffffff;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:92%;background:#ffffff;border:1px solid #e9ebee;border-radius:16px;box-shadow:0 1px 3px rgba(16,24,40,.06);overflow:hidden;">
        <tr><td style="padding:26px 32px 6px;" align="center">
          <img src="${LOGO}" alt="SentriCore" height="38" style="display:block;border:0;outline:none;margin-bottom:6px;"/>
          <div style="font-size:15px;font-weight:800;letter-spacing:.06em;color:#0f766e;text-transform:uppercase;">SentriCore</div>
        </td></tr>
        ${innerHtml}
        <tr><td style="padding:18px 32px 26px;border-top:1px solid #f0f1f3;">
          <p style="margin:0;color:#9aa1ab;font-size:11px;line-height:1.5;text-align:center;">
            Automated message from SentriCore · Please do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

// ── Luma: generic plain-text mail ──
async function sendMail(to, subject, text) {
  const info = await transporter.sendMail({ from: FROM, replyTo: REPLY_TO, to, subject, text });
  return info && info.messageId ? true : false;
}

// ───────────────────────── OTP "Verify your email" ─────────────────────────
function otpHtml(code, name) {
  const inner = `
    <tr><td style="padding:16px 32px 4px;" align="center">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#111827;">Verify your email</h1>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.55;">
        Hi${name ? ' ' + name : ''}, use the verification code below to reset your SentriCore password.
      </p>
    </td></tr>
    <tr><td style="padding:20px 32px 6px;" align="center">
      <div style="display:inline-block;background:#f0fdfa;border:1.5px solid #99f6e4;border-radius:14px;padding:16px 26px;">
        <div style="font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#0f766e;padding-left:10px;">${code}</div>
      </div>
    </td></tr>
    <tr><td style="padding:8px 32px 0;" align="center">
      <p style="margin:0;color:#9aa1ab;font-size:12px;">Tap &amp; hold the code to copy · expires in ${OTP_EXP_MINUTES} minutes</p>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.55;text-align:center;">
        If you did not request this, you can safely ignore this email — your password will not change.
      </p>
    </td></tr>`;
  return wrap(inner);
}

async function sendOtpEmail(to, code, name) {
  const info = await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: `Your SentriCore verification code: ${code}`,
    text: `Hi${name ? ' ' + name : ''},\n\nYour SentriCore verification code is: ${code}\n\nThis code expires in ${OTP_EXP_MINUTES} minutes. If you did not request this, please ignore this email.`,
    html: otpHtml(code, name),
  });
  return info && info.messageId ? true : false;
}

// ───────────────────────── Account welcome ─────────────────────────
function credRow(label, value) {
  return `
    <tr><td style="padding:12px 0 4px;color:#9aa1ab;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">${label}</td></tr>
    <tr><td style="padding:0;">
      <div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;
        font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#111827;word-break:break-all;">${value}</div>
    </td></tr>`;
}
function accountHtml(username, password, name) {
  const inner = `
    <tr><td style="padding:16px 32px 4px;" align="center">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#111827;">Welcome to SentriCore</h1>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.55;">
        Hi${name ? ' ' + name : ''}, your account has been created by your subdivision administrator.
      </p>
    </td></tr>
    <tr><td style="padding:6px 32px 2px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${credRow('Username', username)}
        ${credRow('Temporary Password', password)}
      </table>
    </td></tr>
    <tr><td style="padding:18px 32px 4px;" align="center">
      <a href="${APP_BASE_URL}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 30px;border-radius:999px;">Sign in to SentriCore</a>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <p style="margin:0;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.55;">
        For your security, please change this temporary password after your first login.
      </p>
    </td></tr>`;
  return wrap(inner);
}

async function sendAccountEmail(to, username, password, name) {
  const info = await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: 'Your SentriCore account details',
    text: `Welcome to SentriCore!\n\nUsername: ${username}\nTemporary Password: ${password}\n\nSign in at ${APP_BASE_URL} and please change your password after your first login.`,
    html: accountHtml(username, password, name),
  });
  return info && info.messageId ? true : false;
}

module.exports = { transporter, sendMail, sendOtpEmail, sendAccountEmail, OTP_EXP_MINUTES };
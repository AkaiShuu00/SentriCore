// config/mailer.js
// SentriCore automated email sender (Gmail SMTP via App Password).
// Nag-e-export ng DALAWA:
//   - sendMail(to, subject, text)        → luma, generic (huwag alisin, may gumagamit pa)
//   - sendOtpEmail(to, code, name)       → bago, branded "Verify Email" OTP card (no-reply)
// Lahat ng creds ay galing sa .env (SMTP_USER, SMTP_PASS). Walang hardcoded.
const nodemailer = require('nodemailer');
require('dotenv').config();

const OTP_EXP_MINUTES = parseInt(process.env.OTP_EXP_MINUTES || '10', 10);
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://sentricore.koreacentral.cloudapp.azure.com';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Display bilang no-reply kahit Gmail ang aktwal na account.
const FROM = `"SentriCore (No Reply)" <${SMTP_USER}>`;
const REPLY_TO = 'no-reply@sentricore';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ── Luma: generic plain-text mail (pinapanatili para hindi masira ang ibang code) ──
async function sendMail(to, subject, text) {
  const info = await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject,
    text,
  });
  return info && info.messageId ? true : false;
}

// ── Bago: branded "Verify Email" OTP card (Maya-style), automated, no-reply, may expiry ──
function otpHtml(code, name) {
  const digits = String(code).split('').map(
    (d) => `<td style="width:46px;height:56px;border:2px solid #0d9488;border-radius:12px;
      text-align:center;font-size:26px;font-weight:800;color:#0f3b3a;font-family:Arial,Helvetica,sans-serif;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  return `<!doctype html><html><body style="margin:0;background:#0f3b3a;padding:28px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#fdf6ec;border-radius:20px;overflow:hidden;max-width:92%;">
      <tr><td style="background:#0f3b3a;padding:22px 28px;" align="center">
        <img src="${APP_BASE_URL}/logo.png" alt="SentriCore" height="40" style="display:block;border:0;outline:none;"/>
      </td></tr>
      <tr><td style="padding:30px 32px 8px;">
        <h1 style="margin:0 0 6px;font-size:22px;color:#0f3b3a;">Verify your email</h1>
        <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.5;">
          Hi${name ? ' ' + name : ''}, use the verification code below to continue resetting your SentriCore password.
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 6px;" align="center">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
      </td></tr>
      <tr><td style="padding:14px 32px 4px;" align="center">
        <span style="display:inline-block;background:#e6f4f3;color:#0d9488;font-size:12px;font-weight:700;
          padding:6px 14px;border-radius:999px;">Expires in ${OTP_EXP_MINUTES} minutes</span>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
          If you did not request this, you can safely ignore this email. Your password will not change.
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;border-top:1px solid #ecdfce;margin-top:16px;">
        <p style="margin:14px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
          This is an automated message from SentriCore. Please do not reply — this inbox is not monitored.
        </p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendOtpEmail(to, code, name) {
  const info = await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: 'Your SentriCore verification code',
    text: `Your SentriCore verification code is: ${code}\nThis code expires in ${OTP_EXP_MINUTES} minutes. If you did not request this, please ignore.`,
    html: otpHtml(code, name),
  });
  return info && info.messageId ? true : false;
}

// ── Account welcome email: ipapadala kapag ginawan ng account ang resident ──
function accountHtml(username, password, name) {
  const row = (label, value) => `
    <tr><td style="padding:10px 0 2px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${label}</td></tr>
    <tr><td style="padding:0 0 6px;">
      <div style="background:#fff;border:2px solid #0d9488;border-radius:12px;padding:12px 16px;
        font-size:17px;font-weight:800;color:#0f3b3a;font-family:'Courier New',monospace;word-break:break-all;">${value}</div>
    </td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#0f3b3a;padding:28px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#fdf6ec;border-radius:20px;overflow:hidden;max-width:92%;">
      <tr><td style="background:#0f3b3a;padding:22px 28px;" align="center">
        <img src="${APP_BASE_URL}/logo.png" alt="SentriCore" height="40" style="display:block;border:0;outline:none;"/>
      </td></tr>
      <tr><td style="padding:30px 32px 6px;">
        <h1 style="margin:0 0 6px;font-size:22px;color:#0f3b3a;">Welcome to SentriCore</h1>
        <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.5;">
          Hi${name ? ' ' + name : ''}, an account has been created for you by your subdivision administrator.
          Use the credentials below to sign in.
        </p>
      </td></tr>
      <tr><td style="padding:14px 32px 2px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Username', username)}
          ${row('Temporary Password', password)}
        </table>
      </td></tr>
      <tr><td style="padding:12px 32px 2px;" align="center">
        <a href="${APP_BASE_URL}" style="display:inline-block;background:#0f3b3a;color:#fff;text-decoration:none;
          font-size:15px;font-weight:700;padding:12px 26px;border-radius:999px;">Sign in to SentriCore</a>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0;color:#b45309;background:#fef3c7;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;">
          For your security, please change this temporary password after your first login.
        </p>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
          If you did not expect this email, please contact your subdivision administrator.
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;border-top:1px solid #ecdfce;margin-top:16px;">
        <p style="margin:14px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
          This is an automated message from SentriCore. Please do not reply — this inbox is not monitored.
        </p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
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
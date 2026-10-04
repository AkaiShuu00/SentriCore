// SentriCore field-level encryption (AES-256-GCM).
// Ginagamit para i-encrypt ang sensitive user info bago isave sa DB,
// at i-decrypt kapag binabasa. Ang key ay galing sa .env (ENCRYPTION_KEY).
//
// Ligtas (backward-compatible): ang encrypted values ay may prefix na "enc:".
// Kapag hindi "enc:" ang laman (lumang plaintext row), ibabalik as-is ng decrypt().
const crypto = require('crypto');
require('dotenv').config();

const ALGO = 'aes-256-gcm';
// Gawing 32-byte key kahit anong haba ng ENCRYPTION_KEY (SHA-256 derive).
const KEY = crypto
  .createHash('sha256')
  .update(String(process.env.ENCRYPTION_KEY || 'sentricore-dev-key'))
  .digest();

function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // format: enc:<base64(iv|tag|ciphertext)>
  return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(data) {
  try {
    if (typeof data !== 'string' || !data.startsWith('enc:')) return data; // plaintext / walang laman
    const raw = Buffer.from(data.slice(4), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const d = crypto.createDecipheriv(ALGO, KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return data; // kung sakaling mali ang key/data, huwag mag-crash
  }
}

module.exports = { encrypt, decrypt };
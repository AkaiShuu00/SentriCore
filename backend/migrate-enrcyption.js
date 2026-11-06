// backend/migrate-encryption.js
// ONE-TIME migration: inaayos ang phone numbers na "enc:" na hindi na-decrypt dahil
// sa key mismatch. Sinusubukan ang LAHAT ng candidate keys (current + default + optional
// OLD_ENCRYPTION_KEY), kinukuha ang plaintext, tapos IRE-RE-ENCRYPT gamit ang CURRENT key.
// Pagkatapos: madi-decrypt na ang numero sa admin, resident, at guard views.
//
// PATAKBO (sa loob ng backend folder, para ma-load ang .env):
//   node migrate-encryption.js
// (Opsyonal, kung alam mo ang lumang key:)
//   OLD_ENCRYPTION_KEY=<lumang key> node migrate-encryption.js

const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./config/db');

const ALGO = 'aes-256-gcm';
const derive = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Lahat ng posibleng key na susubukan sa pag-decrypt (walang duplicate).
const CANDIDATE_SOURCES = [
  process.env.ENCRYPTION_KEY || 'sentricore-dev-key', // current
  'sentricore-dev-key',                               // default fallback
  process.env.OLD_ENCRYPTION_KEY,                     // optional, kung meron
].filter(Boolean);
const CANDIDATE_KEYS = [...new Set(CANDIDATE_SOURCES)].map(derive);

const CURRENT_KEY = derive(process.env.ENCRYPTION_KEY || 'sentricore-dev-key');

function tryDecrypt(value) {
  // Returns { plain, wasEnc } — plain=null kung hindi mabawi.
  if (typeof value !== 'string' || value === '') return { plain: value, wasEnc: false };
  if (!value.startsWith('enc:')) return { plain: value, wasEnc: false }; // plaintext na
  const raw = Buffer.from(value.slice(4), 'base64');
  const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), enc = raw.subarray(28);
  for (const key of CANDIDATE_KEYS) {
    try {
      const d = crypto.createDecipheriv(ALGO, key, iv);
      d.setAuthTag(tag);
      const plain = Buffer.concat([d.update(enc), d.final()]).toString('utf8');
      return { plain, wasEnc: true };
    } catch { /* subukan ang susunod na key */ }
  }
  return { plain: null, wasEnc: true }; // hindi mabawi ng kahit anong candidate key
}

function encryptCurrent(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, CURRENT_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');
}

async function migrateTable(table, idCol, col) {
  let changed = 0, lost = 0, skipped = 0;
  let rows = [];
  try {
    [rows] = await pool.query(`SELECT ${idCol} AS id, ${col} AS val FROM ${table}`);
  } catch (e) {
    console.log(`  (skip ${table}.${col}: ${e.message})`);
    return { changed, lost, skipped };
  }
  for (const r of rows) {
    const { plain, wasEnc } = tryDecrypt(r.val);
    if (plain === null) { lost++; console.log(`  ! ${table}#${r.id}: hindi mabawi (ibang key).`); continue; }
    if (plain === '' || plain === null || plain === undefined) { skipped++; continue; }
    const reenc = encryptCurrent(plain);
    // I-update lang kung nagbago (hal. galing sa ibang key, o plaintext → encrypted)
    if (reenc !== r.val) {
      await pool.query(`UPDATE ${table} SET ${col} = ? WHERE ${idCol} = ?`, [reenc, r.id]);
      changed++;
    } else {
      skipped++;
    }
  }
  console.log(`  ${table}.${col}: ${changed} re-encrypted, ${skipped} ok/blank, ${lost} unrecoverable`);
  return { changed, lost, skipped };
}

(async () => {
  console.log('Candidate keys being tried:', CANDIDATE_SOURCES.map((s) => (s === (process.env.ENCRYPTION_KEY || 'sentricore-dev-key') ? '[current]' : '[other]')));
  console.log('Migrating phone numbers to the CURRENT key…');
  await migrateTable('Residents', 'resident_id', 'phone_number');
  await migrateTable('Guards', 'guard_id', 'phone_number');
  // Admins phone ay plaintext sa design; isinasama lang kung naka-"enc:" ito.
  await migrateTable('Admins', 'admin_id', 'phone_number');
  console.log('Done. I-restart ang SentriCoreBackend, tapos i-refresh ang app.');
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
// seed.js — SentriCore demo data seeder (RESIDENTS + LOGS + COMPLAINTS + REPORTS ONLY)
// Patakbuhin: node seed.js   (nasa backend folder, katabi ng config/db.js)
//
// ⚠️ HINDI hinahawakan ang GUARDS at ADMIN — ginagamit lang ang existing guards para
//    ikabit sa mga transaction/report. Residents, logs, complaints, reports lang ang sine-seed.
//
//   Residents: resident1..resident200 / resident123
//
// Data: mula JUNE 2026 hanggang ngayon. 200 residents, daan-daang visitors + deliveries,
//       batch, linked, active + expected ngayon, complaints, at guard reports.
//       Address format: "Block 7 Daniel Street" (Bible-themed na street names).

const pool = require('./config/db');
const bcrypt = require('bcrypt');

const pad = (n) => String(n).padStart(3, '0');
function dt(y, m, d, hh = 9, mm = 0) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const plusDaysISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const clampDay = (d) => Math.max(1, Math.min(28, d));

const RESIDENT_COUNT = 200;
const RESIDENT_USERS = Array.from({ length: RESIDENT_COUNT }, (_, i) => `resident${i + 1}`);

// ---- Bible-themed generators (deterministic) ----
const BIBLE_FIRST = ['Judith', 'Daniel', 'Esther', 'Ruth', 'Samuel', 'Isaiah', 'Noah', 'David', 'Solomon', 'Elijah',
  'Sarah', 'Rebecca', 'Rachel', 'Leah', 'Hannah', 'Miriam', 'Deborah', 'Naomi', 'Abigail', 'Mary',
  'Martha', 'Joanna', 'Lydia', 'Priscilla', 'Paul', 'Peter', 'John', 'James', 'Andrew', 'Thomas',
  'Philip', 'Matthew', 'Luke', 'Mark', 'Stephen', 'Timothy', 'Titus', 'Silas', 'Barnabas', 'Aaron',
  'Moses', 'Joshua', 'Caleb', 'Gideon', 'Jacob', 'Joseph', 'Benjamin', 'Levi', 'Judah', 'Simeon',
  'Nathan', 'Ezra', 'Nehemiah', 'Job', 'Jonah', 'Micah', 'Amos', 'Hosea', 'Joel', 'Nahum',
  'Enoch', 'Seth', 'Abel', 'Abraham', 'Isaac', 'Gabriel', 'Michael', 'Zachariah', 'Elizabeth', 'Anna'];
const BIBLE_LAST = ['Canaan', 'Jordan', 'Hebron', 'Zion', 'Carmel', 'Tabor', 'Sinai', 'Nazareth', 'Galilee', 'Judea',
  'Samaria', 'Bethany', 'Jericho', 'Gilead', 'Sharon', 'Eden', 'Moriah', 'Horeb', 'Bashan', 'Shiloh',
  'Gibeon', 'Ramah', 'Ophir', 'Tarshish', 'Cana', 'Emmaus', 'Capernaum', 'Bethel', 'Magdala', 'Kedar',
  'Seir', 'Nineveh', 'Babylon', 'Damascus', 'Lebanon', 'Pisgah', 'Peniel', 'Succoth', 'Shechem', 'Gerar'];
const STREETS = ['Daniel', 'Judith', 'Exodus', 'Leviticus', 'Genesis', 'Numbers', 'Joshua', 'Ruth', 'Samuel', 'Psalms',
  'Proverbs', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Jonah', 'Micah', 'Matthew',
  'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Timothy', 'Titus', 'James', 'Jude', 'Peter',
  'Hebrews', 'Esther', 'Ezra', 'Nehemiah', 'Solomon', 'Elijah', 'Elisha', 'Nahum', 'Obadiah', 'Malachi'];

const fullName = (i) => `${BIBLE_FIRST[i % BIBLE_FIRST.length]} ${BIBLE_LAST[(i * 3 + 7) % BIBLE_LAST.length]}`;
const visitorName = (i, k) => `${BIBLE_FIRST[(i * 5 + k + 11) % BIBLE_FIRST.length]} ${BIBLE_LAST[(i * 2 + k + 3) % BIBLE_LAST.length]}`;
const addressFor = (i) => `Block ${(i % 12) + 1} ${STREETS[i % STREETS.length]} Street`;

// ---- Complaint + report samples (module scope para magamit din sa cleanup) ----
const COMP = [
  ['Visitor', 'Visitor refused to show ID', 'Unregistered visitor', 'Pending', null],
  ['Visitor', 'Visitor overstayed past curfew', 'Curfew violation', 'Acknowledged', 'Visitor was reminded of the 10 PM curfew.'],
  ['Guard', 'Guard was rude at the gate', 'Staff conduct', 'Acknowledged', 'Guard verbally reminded on proper conduct.'],
  ['Guard', 'Slow entry processing', 'Service delay', 'Resolved', 'Added a second lane during peak hours.'],
  ['Security', 'Broken CCTV near Block 3', 'CCTV / equipment', 'Pending', null],
  ['Security', 'Suspicious person loitering', 'Security concern', 'Resolved', 'Patrol increased; area cleared.'],
  ['HOA', 'Street light not working', 'Maintenance', 'Acknowledged', 'Maintenance request scheduled.'],
  ['HOA', 'Garbage not collected on time', 'Sanitation', 'Resolved', 'Collection schedule corrected.'],
  ['Visitor', 'Delivery rider used wrong gate', 'Gate misuse', 'Resolved', 'Rider redirected to the delivery gate.'],
  ['Security', 'Tailgating vehicle at entry', 'Security concern', 'Pending', null],
  ['HOA', 'Clogged drainage after rain', 'Maintenance', 'Acknowledged', 'Drainage cleaning scheduled.'],
  ['Guard', 'No guard at gate during shift', 'Staffing', 'Resolved', 'Shift coverage reviewed and fixed.'],
  ['Visitor', 'Unverified contractor entered', 'Unregistered visitor', 'Acknowledged', 'Contractor list now required.'],
  ['Security', 'Perimeter fence damaged', 'Security concern', 'Pending', null],
  ['HOA', 'Noise complaint from event', 'Noise', 'Resolved', 'Homeowner advised on noise policy.'],
  ['Visitor', 'Visitor parked blocking driveway', 'Parking', 'Resolved', 'Visitor asked to transfer; towing policy shared.'],
  ['Guard', 'Logbook entry missing', 'Record keeping', 'Acknowledged', 'Digital log reinforced.'],
  ['Security', 'Gate left open at night', 'Security concern', 'Resolved', 'Night checklist updated.'],
];
const REP = [
  ['Security Concern', 'Suspicious vehicle', 'Main Gate', 'Unregistered vehicle circled the block twice.', 'Open'],
  ['Small Problem', 'Barrier malfunction', 'Gate 1', 'Boom barrier stuck halfway for 10 minutes.', 'Acknowledged'],
  ['Incident', 'Minor vehicle scratch', 'Parking Area', 'Two vehicles brushed while entering.', 'Resolved'],
  ['Security Concern', 'Tailgating attempt', 'Main Gate', 'Motorcycle tried to follow a resident in.', 'Open'],
  ['Small Problem', 'Flickering gate light', 'Gate 1', 'Entry light flickers at night.', 'Acknowledged'],
  ['Incident', 'Lost-and-found item', 'Guard House', 'Wallet turned over by a visitor.', 'Resolved'],
  ['Security Concern', 'Unattended package', 'Delivery Lane', 'Package left without a recipient.', 'Open'],
  ['Small Problem', 'Intercom static', 'Main Gate', 'Hard to hear residents on the intercom.', 'Acknowledged'],
  ['Incident', 'Slip near wet floor', 'Guard House', 'Visitor slipped; no injury.', 'Resolved'],
  ['Security Concern', 'Fence gap spotted', 'Perimeter', 'Small gap near Block 7 fence.', 'Open'],
  ['Small Problem', 'Logbook pen out', 'Gate 1', 'Backup supplies requested.', 'Resolved'],
  ['Incident', 'Noise disturbance', 'Clubhouse', 'Late event ran past allowed hours.', 'Acknowledged'],
];

// ---- Flexible insert: iinsert lang ang existing columns (iwas "unknown column") ----
const _colCache = {};
async function tableCols(table) {
  if (_colCache[table]) return _colCache[table];
  try { const [cols] = await pool.query(`SHOW COLUMNS FROM ${table}`); _colCache[table] = cols.map((c) => c.Field); }
  catch (e) { _colCache[table] = []; }
  return _colCache[table];
}
async function insertFlexible(table, data) {
  const names = await tableCols(table);
  const keys = Object.keys(data).filter((k) => names.includes(k));
  if (!keys.length) return false;
  await pool.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => data[k]));
  return true;
}

async function cleanup() {
  console.log('🧹 Cleaning previous demo residents + their data (guards/admin untouched)...');
  const [users] = await pool.query(
    `SELECT user_id FROM Users WHERE username IN (${RESIDENT_USERS.map(() => '?').join(',')})`,
    RESIDENT_USERS
  );
  const userIds = users.map((u) => u.user_id);
  if (userIds.length) {
    const inU = userIds.map(() => '?').join(',');
    const [resi] = await pool.query(`SELECT resident_id FROM Residents WHERE user_id IN (${inU})`, userIds);
    const resIds = resi.map((r) => r.resident_id);
    if (resIds.length) {
      const inR = resIds.map(() => '?').join(',');
      const [regs] = await pool.query(`SELECT registration_id FROM VisitorRegistrations WHERE resident_id IN (${inR})`, resIds);
      const regIds = regs.map((r) => r.registration_id);
      try { await pool.query(`DELETE FROM Complaints WHERE resident_id IN (${inR})`, resIds); } catch (e) {}
      try { await pool.query(`DELETE FROM GatePickups WHERE resident_id IN (${inR})`, resIds); } catch (e) {}
      await pool.query(`DELETE FROM VisitorTransactions WHERE resident_id IN (${inR})`, resIds);
      if (regIds.length) {
        const inReg = regIds.map(() => '?').join(',');
        await pool.query(`DELETE FROM VisitorRegistrationDetails WHERE registration_id IN (${inReg})`, regIds);
        await pool.query(`DELETE FROM VisitorRegistrations WHERE registration_id IN (${inReg})`, regIds);
      }
    }
    await pool.query(`DELETE FROM Residents WHERE user_id IN (${inU})`, userIds);
    await pool.query(`DELETE FROM Users WHERE user_id IN (${inU})`, userIds);
  }
  // Tanggalin lang ang mga DATING SEEDED na guard reports (exact description match) — hindi ang real reports.
  try {
    const descs = REP.map((r) => r[3]);
    await pool.query(`DELETE FROM GuardReports WHERE description IN (${descs.map(() => '?').join(',')})`, descs);
  } catch (e) {}
}

async function seed() {
  try {
    await cleanup();

    // ---- Kunin ang EXISTING guards (hindi ginagalaw) para ikabit sa transactions/reports ----
    const [guards] = await pool.query(`SELECT guard_id, gate_id FROM Guards ORDER BY guard_id`);
    if (!guards.length) {
      console.error('❌ Walang guards sa database. Magdagdag muna ng guard bago mag-seed (para may maikabit sa logs).');
      process.exit(1);
    }
    const GID = [guards[0].guard_id, (guards[1] || guards[0]).guard_id];
    const GATE = [guards[0].gate_id || 1, (guards[1] || guards[0]).gate_id || 1];
    console.log(`👮 Using existing guards: ${GID.join(', ')}`);

    const residentPw = await bcrypt.hash('resident123', 10);

    // ---- RESIDENTS (200) ----
    console.log(`🌱 Seeding ${RESIDENT_COUNT} residents...`);
    const residentIds = [];
    for (let i = 0; i < RESIDENT_COUNT; i++) {
      const [u] = await pool.query(`INSERT INTO Users (role_id, username, password_hash) VALUES (3, ?, ?)`, [RESIDENT_USERS[i], residentPw]);
      const phone = `0917${String(1000000 + i).slice(-7)}`;
      const [r] = await pool.query(
        `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email) VALUES (?, ?, ?, ?, ?)`,
        [u.insertId, fullName(i), addressFor(i), phone, `resident${i + 1}.sentricore@gmail.com`]
      );
      residentIds.push(r.insertId);
    }

    console.log('🌱 Seeding visits + deliveries (June–present)...');
    let vCount = 0, dCount = 0;
    const vPass = () => `V-${pad(++vCount)}`;
    const dPass = () => `D-${pad(++dCount)}`;

    async function seedCompletedVisit(resId, name, y, m, d, hh, isDelivery = false, gi = 0) {
      const type = isDelivery ? 'Delivery' : 'Single';
      const vtype = isDelivery ? 'Delivery' : 'Visitor';
      const purpose = isDelivery ? 'Package delivery' : 'Family visit';
      const expDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, order_id, purpose, expected_date, status)
         VALUES (?, ?, ?, ?, ?, 'Departed')`,
        [resId, type, isDelivery ? `PH-${y}${m}${d}-${dCount + 1}` : null, purpose, expDate]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`, [reg.insertId, name]);
      await pool.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, exit_guard_id, gate_id, registration_id, visitor_name, visitor_type, purpose, plate_number, pass_number, entry_time, exit_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [resId, GID[gi], GID[(gi + 1) % 2], GATE[gi], reg.insertId, name.toUpperCase(), vtype, purpose,
         null, isDelivery ? dPass() : vPass(), dt(y, m, d, hh, 0), dt(y, m, d, hh + 2, 0)]
      );
    }

    for (let i = 0; i < residentIds.length; i++) {
      const resId = residentIds[i];
      const gi = i % 2;
      await seedCompletedVisit(resId, visitorName(i, 0), 2026, 6 + (i % 5), clampDay(1 + (i % 27)), 9, false, gi);
      await seedCompletedVisit(resId, visitorName(i, 1), 2026, 6 + ((i + 3) % 6), clampDay(1 + ((i + 5) % 27)), 13, false, gi);
      if (i % 2 === 0) {
        await seedCompletedVisit(resId, visitorName(i, 2), 2026, 6 + ((i + 1) % 6), clampDay(1 + ((i + 9) % 27)), 15, true, gi);
      }
    }

    // ---- BATCH (resident1), Completed, 3 magkasabay (arrival = linked) ----
    {
      const resId = residentIds[0];
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, batch_name, purpose, expected_date, status)
         VALUES (?, 'Batch', '728', 'Birthday celebration', '2026-09-28', 'Departed')`, [resId]
      );
      const batchNames = ['Luis Perez', 'Marites Cruz', 'Andoy Reyes'];
      for (const n of batchNames) await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`, [reg.insertId, n]);
      const [arr] = await pool.query(`INSERT INTO Arrivals () VALUES ()`);
      for (const n of batchNames) {
        await pool.query(
          `INSERT INTO VisitorTransactions
            (resident_id, guard_id, exit_guard_id, gate_id, registration_id, arrival_id, visitor_name, visitor_type, purpose, pass_number, entry_time, exit_time, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Visitor', 'Birthday celebration', ?, '2026-09-28 15:00:00', '2026-09-28 20:30:00', 'Completed')`,
          [resId, GID[0], GID[1], GATE[0], reg.insertId, arr.insertId, n.toUpperCase(), vPass()]
        );
      }
    }

    // ---- ACTIVE ngayon: 2 visitors + 1 delivery ----
    const ny = new Date().getFullYear(), nm = new Date().getMonth() + 1, nd = new Date().getDate();
    async function seedActive(resId, name, isDelivery, hh) {
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, order_id, purpose, expected_date, status)
         VALUES (?, ?, ?, ?, ?, 'Active')`,
        [resId, isDelivery ? 'Delivery' : 'Single', isDelivery ? 'PH-ACTIVE-01' : null, isDelivery ? 'Package delivery' : 'Family visit', todayISO()]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`, [reg.insertId, name]);
      await pool.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, visitor_name, visitor_type, purpose, plate_number, pass_number, entry_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [resId, GID[0], GATE[0], reg.insertId, name.toUpperCase(), isDelivery ? 'Delivery' : 'Visitor',
         isDelivery ? 'Package delivery' : 'Family visit', isDelivery ? 'ABC 1234' : null, isDelivery ? dPass() : vPass(), dt(ny, nm, nd, hh, 15)]
      );
    }
    await seedActive(residentIds[1], 'Rico Hernandez', false, 8);
    await seedActive(residentIds[4], 'Grace Canaan', false, 10);
    await seedActive(residentIds[2], 'Lalamove Rider', true, 9);

    // ---- EXPECTED (hindi pa dumating) ----
    {
      const [reg1] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, purpose, expected_date, status)
         VALUES (?, 'Single', 'Tutor session', ?, 'Expected')`, [residentIds[0], plusDaysISO(1)]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Patricia Shiloh')`, [reg1.insertId]);
      const [reg2] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, order_id, purpose, expected_date, status)
         VALUES (?, 'Delivery', 'SHP-77001', 'Appliance delivery', ?, 'Expected')`, [residentIds[3], todayISO()]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Delivery Rider')`, [reg2.insertId]);
    }

    // ---- COMPLAINTS ----
    console.log('🌱 Seeding complaints...');
    let compOk = 0;
    for (let i = 0; i < COMP.length; i++) {
      const [category, subject, ctype, status, resolution] = COMP[i];
      const d = new Date(); d.setDate(d.getDate() - (i * 5 + 3));
      const incident = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      try {
        if (await insertFlexible('Complaints', {
          resident_id: residentIds[(i * 7) % residentIds.length],
          category, subject, complaint_type: ctype, description: subject + '.',
          incident_date: incident, status, resolution, blocklist: 0,
          created_at: dt(d.getFullYear(), d.getMonth() + 1, d.getDate(), 10, 0),
        })) compOk++;
      } catch (e) { if (i === 0) console.warn('   (Complaints skipped:', e.message, ')'); }
    }

    // ---- GUARD REPORTS ----
    console.log('🌱 Seeding guard reports...');
    let repOk = 0;
    for (let i = 0; i < REP.length; i++) {
      const [category, rtype, location, description, status] = REP[i];
      const d = new Date(); d.setDate(d.getDate() - (i * 6 + 2));
      try {
        if (await insertFlexible('GuardReports', {
          guard_id: GID[i % 2], category, report_type: rtype, location, description, status,
          created_at: dt(d.getFullYear(), d.getMonth() + 1, d.getDate(), 20, 0),
        })) repOk++;
      } catch (e) { if (i === 0) console.warn('   (GuardReports skipped:', e.message, ')'); }
    }

    console.log('✅ Seeding complete!');
    console.log(`   Residents: ${RESIDENT_COUNT}  (resident1..resident${RESIDENT_COUNT} / resident123)`);
    console.log(`   Visitors : ${vCount}   Deliveries: ${dCount}`);
    console.log(`   Complaints: ${compOk}   Guard reports: ${repOk}`);
    console.log('   (Guards at admin: hindi ginalaw.)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
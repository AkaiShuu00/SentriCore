// seeds.js — SentriCore demo data seeder
// Patakbuhin: node seeds.js
// LIGTAS i-rerun: nililinis muna ang demo rows bago mag-insert (walang duplicate error).
// Pwede pa ring mag-add ng resident/guard/transaction sa app pagkatapos — seeded lang ito bilang simula.
//
// Accounts:
//   Admin:  admin@sentricore  / admin0001
//   Guards: guard1@sentricore / guard0001 ,  guard2@sentricore / guard0002
//   Residents: resident1..resident30 / resident123

const pool = require('./config/db');
const bcrypt = require('bcrypt');

const pad = (n) => String(n).padStart(3, '0');
function dt(y, m, d, hh = 9, mm = 0) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const plusDaysISO = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ADMIN_USER = 'admin@sentricore';
const GUARD_USERS = ['guard1@sentricore', 'guard2@sentricore'];
const RESIDENT_COUNT = 30;
const RESIDENT_USERS = Array.from({ length: RESIDENT_COUNT }, (_, i) => `resident${i + 1}`);
const SEED_USERNAMES = [ADMIN_USER, ...GUARD_USERS, ...RESIDENT_USERS];

// ---- Name generators (deterministic, para pare-pareho kada run) ----
const FIRST = ['Juan', 'Maria', 'Roberto', 'Liza', 'Mark', 'Ana', 'Jose', 'Grace', 'Ramon', 'Elena',
  'Paolo', 'Sofia', 'Ben', 'Rita', 'Danilo', 'Karla', 'Noel', 'Teresa', 'Victor', 'Mila',
  'Rafael', 'Jenny', 'Arturo', 'Cora', 'Dennis', 'Fe', 'Glenn', 'Divina', 'Carlos', 'Patricia'];
const LAST = ['Dela Cruz', 'Santos', 'Garcia', 'Fernandez', 'Villanueva', 'Reyes', 'Mendoza', 'Lim', 'Tan', 'Cruz',
  'Flores', 'Ramos', 'Torres', 'Gomez', 'Yap', 'Diaz', 'Aquino', 'Bautista', 'Ong', 'Co',
  'Uy', 'Chua', 'Sy', 'Villar', 'Perez', 'Hernandez', 'Castro', 'Rosales', 'Navarro', 'Domingo'];
const residentFullName = (i) => `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
const visitorName = (i, k) => `${FIRST[(i * 3 + k + 5) % FIRST.length]} ${LAST[(i * 2 + k + 7) % LAST.length]}`;

async function cleanup() {
  console.log('🧹 Cleaning previous demo rows (if any)...');
  const [users] = await pool.query(
    `SELECT user_id FROM Users WHERE username IN (${SEED_USERNAMES.map(() => '?').join(',')})`,
    SEED_USERNAMES
  );
  const userIds = users.map((u) => u.user_id);
  if (userIds.length) {
    const inU = userIds.map(() => '?').join(',');
    const [resi] = await pool.query(`SELECT resident_id FROM Residents WHERE user_id IN (${inU})`, userIds);
    const resIds = resi.map((r) => r.resident_id);
    const [guards] = await pool.query(`SELECT guard_id FROM Guards WHERE user_id IN (${inU})`, userIds);
    const guardIds = guards.map((g) => g.guard_id);

    if (resIds.length) {
      const inR = resIds.map(() => '?').join(',');
      const [regs] = await pool.query(`SELECT registration_id FROM VisitorRegistrations WHERE resident_id IN (${inR})`, resIds);
      const regIds = regs.map((r) => r.registration_id);
      await pool.query(`DELETE FROM VisitorTransactions WHERE resident_id IN (${inR})`, resIds);
      if (regIds.length) {
        const inReg = regIds.map(() => '?').join(',');
        await pool.query(`DELETE FROM VisitorRegistrationDetails WHERE registration_id IN (${inReg})`, regIds);
        await pool.query(`DELETE FROM VisitorRegistrations WHERE registration_id IN (${inReg})`, regIds);
      }
    }
    if (guardIds.length) {
      const inG = guardIds.map(() => '?').join(',');
      try { await pool.query(`DELETE FROM GuardShifts WHERE guard_id IN (${inG})`, guardIds); } catch (e) {}
      try { await pool.query(`UPDATE VisitorTransactions SET guard_id = NULL WHERE guard_id IN (${inG})`, guardIds); } catch (e) {}
      try { await pool.query(`UPDATE VisitorTransactions SET exit_guard_id = NULL WHERE exit_guard_id IN (${inG})`, guardIds); } catch (e) {}
    }
    try { await pool.query(`DELETE FROM Admins WHERE user_id IN (${inU})`, userIds); } catch (e) {}
    await pool.query(`DELETE FROM Guards WHERE user_id IN (${inU})`, userIds);
    await pool.query(`DELETE FROM Residents WHERE user_id IN (${inU})`, userIds);
    await pool.query(`DELETE FROM Users WHERE user_id IN (${inU})`, userIds);
  }
}

async function seed() {
  try {
    await cleanup();
    console.log('🌱 Seeding accounts...');

    const adminPw = await bcrypt.hash('admin0001', 10);
    const guardPw1 = await bcrypt.hash('guard0001', 10);
    const guardPw2 = await bcrypt.hash('guard0002', 10);
    const residentPw = await bcrypt.hash('resident123', 10);

    // ---- ADMIN ----
    const [adminUser] = await pool.query(
      `INSERT INTO Users (role_id, username, password_hash) VALUES (1, ?, ?)`, [ADMIN_USER, adminPw]
    );
    try {
      await pool.query(
        `INSERT INTO Admins (user_id, display_name, phone_number, email)
         VALUES (?, 'HOA Administrator', '09170000001', 'admin.sentricore@gmail.com')`,
        [adminUser.insertId]
      );
    } catch (e) { console.warn('   (Admins table insert skipped:', e.message, ')'); }

    // ---- GUARDS ----
    const [g1] = await pool.query(`INSERT INTO Users (role_id, username, password_hash) VALUES (2, ?, ?)`, [GUARD_USERS[0], guardPw1]);
    await pool.query(
      `INSERT INTO Guards (user_id, gate_id, full_name, employee_id, phone_number, email, shift_start, shift_end, date_hired, status)
       VALUES (?, 1, 'Pedro Santos', 'GD-1001', '09181112222', 'pedro.sentricore@gmail.com', '06:00:00', '18:00:00', '2022-05-12', 'Off Duty')`,
      [g1.insertId]
    );
    const [g2] = await pool.query(`INSERT INTO Users (role_id, username, password_hash) VALUES (2, ?, ?)`, [GUARD_USERS[1], guardPw2]);
    await pool.query(
      `INSERT INTO Guards (user_id, gate_id, full_name, employee_id, phone_number, email, shift_start, shift_end, date_hired, status)
       VALUES (?, 2, 'Maria Reyes', 'GD-1002', '09183334444', 'maria.sentricore@gmail.com', '18:00:00', '06:00:00', '2023-01-09', 'Off Duty')`,
      [g2.insertId]
    );
    const [[guard1]] = await pool.query(`SELECT guard_id FROM Guards WHERE user_id = ?`, [g1.insertId]);
    const [[guard2]] = await pool.query(`SELECT guard_id FROM Guards WHERE user_id = ?`, [g2.insertId]);
    const GID = [guard1.guard_id, guard2.guard_id];
    const GATE = [1, 2];

    // ---- RESIDENTS (30) ----
    const residentIds = [];
    for (let i = 0; i < RESIDENT_COUNT; i++) {
      const username = RESIDENT_USERS[i];
      const fullName = residentFullName(i);
      const address = `Block ${(i % 10) + 1} Lot ${i + 1}`;
      const phone = `0917${String(1000000 + i).slice(-7)}`;
      const email = `resident${i + 1}.sentricore@gmail.com`;
      const [u] = await pool.query(`INSERT INTO Users (role_id, username, password_hash) VALUES (3, ?, ?)`, [username, residentPw]);
      const [r] = await pool.query(
        `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email) VALUES (?, ?, ?, ?, ?)`,
        [u.insertId, fullName, address, phone, email]
      );
      residentIds.push(r.insertId);
    }

    console.log(`🌱 Seeding visits for ${RESIDENT_COUNT} residents...`);

    let vCount = 0, dCount = 0;
    const vPass = () => `V-${pad(++vCount)}`;
    const dPass = () => `D-${pad(++dCount)}`;

    async function seedCompletedVisit(resIdx, name, y, m, d, hh, typeIsDelivery = false) {
      const resId = residentIds[resIdx];
      const type = typeIsDelivery ? 'Delivery' : 'Single';
      const vtype = typeIsDelivery ? 'Delivery' : 'Visitor';
      const purpose = typeIsDelivery ? 'Package delivery' : 'Family visit';
      const expDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, purpose, expected_date, status)
         VALUES (?, ?, ?, ?, 'Departed')`,
        [resId, type, purpose, expDate]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`, [reg.insertId, name]);
      const gi = resIdx % 2;
      await pool.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, exit_guard_id, gate_id, registration_id, visitor_name, visitor_type, purpose, plate_number, pass_number, entry_time, exit_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [resId, GID[gi], GID[(gi + 1) % 2], GATE[gi], reg.insertId, name.toUpperCase(), vtype, purpose,
         null, typeIsDelivery ? dPass() : vPass(), dt(y, m, d, hh, 0), dt(y, m, d, hh + 2, 0)]
      );
    }

    // Bawat resident: 4 completed visit + 1 completed delivery (= 5+), Sept–Oct
    for (let i = 0; i < residentIds.length; i++) {
      const dayBase = 1 + (i % 25);
      await seedCompletedVisit(i, visitorName(i, 0), 2026, 9, dayBase, 9);
      await seedCompletedVisit(i, visitorName(i, 1), 2026, 9, Math.min(28, dayBase + 2), 11);
      await seedCompletedVisit(i, visitorName(i, 2), 2026, 9, Math.min(28, dayBase + 4), 14);
      await seedCompletedVisit(i, visitorName(i, 3), 2026, 9, Math.min(28, dayBase + 6), 16, true); // DELIVERY
      await seedCompletedVisit(i, visitorName(i, 4), 2026, 10, 1 + (i % 4), 10);
    }

    // ---- BATCH (resident1), Completed, 3 magkasabay (arrival) ----
    {
      const resId = residentIds[0];
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, batch_name, purpose, expected_date, status)
         VALUES (?, 'Batch', 'Birthday Party', 'Birthday celebration', '2026-09-28', 'Departed')`,
        [resId]
      );
      const batchNames = ['Luis Perez', 'Marites Cruz', 'Andoy Reyes'];
      for (const n of batchNames) {
        await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, ?)`, [reg.insertId, n]);
      }
      const [arr] = await pool.query(`INSERT INTO Arrivals () VALUES ()`);
      for (const n of batchNames) {
        await pool.query(
          `INSERT INTO VisitorTransactions
            (resident_id, guard_id, exit_guard_id, gate_id, registration_id, arrival_id, visitor_name, visitor_type, purpose, pass_number, entry_time, exit_time, status)
           VALUES (?, ?, ?, 1, ?, ?, ?, 'Visitor', 'Birthday celebration', ?, '2026-09-28 15:00:00', '2026-09-28 20:30:00', 'Completed')`,
          [resId, GID[0], GID[1], reg.insertId, arr.insertId, n.toUpperCase(), vPass()]
        );
      }
    }

    // ---- ACTIVE ngayon: visitor (resident2) + delivery (resident3) ----
    const ny = new Date().getFullYear(), nm = new Date().getMonth() + 1, nd = new Date().getDate();
    {
      const resId = residentIds[1];
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, purpose, expected_date, status)
         VALUES (?, 'Single', 'Family visit', ?, 'Active')`, [resId, todayISO()]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Rico Hernandez')`, [reg.insertId]);
      await pool.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, visitor_name, visitor_type, purpose, pass_number, entry_time, status)
         VALUES (?, ?, 1, ?, 'RICO HERNANDEZ', 'Visitor', 'Family visit', ?, ?, 'Active')`,
        [resId, GID[0], reg.insertId, vPass(), dt(ny, nm, nd, 8, 30)]
      );
    }
    {
      const resId = residentIds[2];
      const [reg] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, order_id, purpose, expected_date, status)
         VALUES (?, 'Delivery', 'PH-2026-99887', 'Package delivery', ?, 'Active')`, [resId, todayISO()]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Delivery Rider')`, [reg.insertId]);
      await pool.query(
        `INSERT INTO VisitorTransactions
          (resident_id, guard_id, gate_id, registration_id, visitor_name, visitor_type, purpose, plate_number, pass_number, entry_time, status)
         VALUES (?, ?, 1, ?, 'LALAMOVE RIDER', 'Delivery', 'Package delivery', 'ABC 1234', ?, ?, 'Active')`,
        [resId, GID[0], reg.insertId, dPass(), dt(ny, nm, nd, 9, 15)]
      );
    }

    // ---- EXPECTED (hindi pa dumarating): bukas (resident1) + delivery ngayon (resident4) ----
    {
      const [reg1] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, purpose, expected_date, status)
         VALUES (?, 'Single', 'Tutor session', ?, 'Expected')`, [residentIds[0], plusDaysISO(1)]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Patricia Gomez')`, [reg1.insertId]);

      const [reg2] = await pool.query(
        `INSERT INTO VisitorRegistrations (resident_id, registration_type, order_id, purpose, expected_date, status)
         VALUES (?, 'Delivery', 'SHP-77001', 'Appliance delivery', ?, 'Expected')`, [residentIds[3], todayISO()]
      );
      await pool.query(`INSERT INTO VisitorRegistrationDetails (registration_id, visitor_name) VALUES (?, 'Delivery Rider')`, [reg2.insertId]);
    }

    console.log('✅ Seeding complete!');
    console.log('   Admin:     admin@sentricore / admin0001');
    console.log('   Guards:    guard1@sentricore / guard0001 , guard2@sentricore / guard0002');
    console.log(`   Residents: resident1..resident${RESIDENT_COUNT} / resident123`);
    console.log('   Data:      5+ transactions/resident (Sept–Oct), batch, deliveries, active + expected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
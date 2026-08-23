const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('🌱 Seeding accounts...');

    const adminPw = await bcrypt.hash('admin123', 10);
    const guardPw = await bcrypt.hash('guard123', 10);
    const residentPw = await bcrypt.hash('resident123', 10);

    // --- ADMIN ---
    const [adminUser] = await pool.query(
      `INSERT INTO Users (role_id, username, password_hash) VALUES (1, 'admin1', ?)`,
      [adminPw]
    );

    // --- GUARDS ---
    const [g1] = await pool.query(
      `INSERT INTO Users (role_id, username, password_hash) VALUES (2, 'guard1', ?)`,
      [guardPw]
    );
    await pool.query(
      `INSERT INTO Guards (user_id, gate_id, full_name, employee_id, phone_number, email, shift_start, shift_end, date_hired)
       VALUES (?, 1, 'Pedro Santos', 'GD-1001', '09181112222', 'pedro.sentricore', '06:00:00', '18:00:00', '2022-05-12')`,
      [g1.insertId]
    );

    const [g2] = await pool.query(
      `INSERT INTO Users (role_id, username, password_hash) VALUES (2, 'guard2', ?)`,
      [guardPw]
    );
    await pool.query(
      `INSERT INTO Guards (user_id, gate_id, full_name, employee_id, phone_number, email, shift_start, shift_end, date_hired)
       VALUES (?, 2, 'Maria Reyes', 'GD-1002', '09183334444', 'maria.sentricore', '18:00:00', '06:00:00', '2023-01-09')`,
      [g2.insertId]
    );

    // --- RESIDENTS ---
    const residents = [
      ['resident1', 'Juan Dela Cruz', 'Block 1 Lot 1', '09171234567', 'juandelacruz.sentricore'],
      ['resident2', 'Maria Santos', 'Block 2 Lot 5', '09171234568', 'mariasantos.sentricore'],
      ['resident3', 'Roberto Garcia', 'Block 3 Lot 9', '09171234569', 'robertogarcia.sentricore'],
      ['resident4', 'Liza Fernandez', 'Block 4 Lot 2', '09171234570', 'lizafernandez.sentricore'],
      ['resident5', 'Mark Villanueva', 'Block 5 Lot 7', '09171234571', 'markvillanueva.sentricore'],
    ];

    for (const [username, fullName, address, phone, email] of residents) {
      const [u] = await pool.query(
        `INSERT INTO Users (role_id, username, password_hash) VALUES (3, ?, ?)`,
        [username, residentPw]
      );
      await pool.query(
        `INSERT INTO Residents (user_id, full_name, unit_address, phone_number, email) VALUES (?, ?, ?, ?, ?)`,
        [u.insertId, fullName, address, phone, email]
      );
    }

    console.log('✅ Seeding complete!');
    console.log('   Admin:    admin1 / admin123');
    console.log('   Guards:   guard1, guard2 / guard123');
    console.log('   Residents: resident1-5 / resident123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
const pool = require('../config/db');

// GET /api/guards  (authenticated) — listahan ng guards para sa Contact Guard (resident side)
// Defensive: aangkop sa kahit anong column names na meron ang Guards table mo.
async function listGuards(req, res) {
  try {
    // Kunin ang available columns para alam natin kung ano ang pwedeng piliin
    const [cols] = await pool.query('SHOW COLUMNS FROM Guards');
    const names = cols.map((c) => c.Field);
    const has = (n) => names.includes(n);

    // Subukang isama ang email/contact mula Users kung wala sa Guards
    let rows = [];
    try {
      const [r] = await pool.query(
        `SELECT g.*, u.username AS u_username, u.email AS u_email
         FROM Guards g LEFT JOIN Users u ON u.user_id = g.user_id`
      );
      rows = r;
    } catch (e) {
      const [r] = await pool.query('SELECT * FROM Guards');
      rows = r;
    }

    // Gate names (kung may Gates table)
    let gateMap = {};
    if (has('gate_id')) {
      try {
        const [gates] = await pool.query('SELECT * FROM Gates');
        gates.forEach((g) => {
          const id = g.gate_id;
          gateMap[id] = g.gate_name || g.name || g.gate_number || (`Gate ${id}`);
        });
      } catch (e) { /* walang Gates table — okay lang */ }
    }

    const pick = (obj, keys) => {
      for (const k of keys) if (obj[k] != null && obj[k] !== '') return obj[k];
      return null;
    };

    // I-normalize ang duty status → ON DUTY / ON BREAK / OFF DUTY / UNAVAILABLE
    const normStatus = (val) => {
      const s = String(val || '').toLowerCase();
      if (!s) return 'OFF DUTY';
      if (s.includes('break')) return 'ON BREAK';
      if (s.includes('unavail')) return 'UNAVAILABLE';
      if (s === '1' || s === 'true' || s.includes('on') || s.includes('active') || s.includes('duty')) {
        return s.includes('off') ? 'OFF DUTY' : 'ON DUTY';
      }
      if (s === '0' || s === 'false' || s.includes('off') || s.includes('inactive')) return 'OFF DUTY';
      return 'OFF DUTY';
    };

    const guards = rows.map((g) => {
      const gateId = pick(g, ['gate_id']);
      return {
        guardId: pick(g, ['guard_id']),
        name: pick(g, ['full_name', 'name', 'u_username']) || 'Guard',
        phone: pick(g, ['contact_number', 'contact', 'phone', 'phone_number', 'mobile']) || '',
        email: pick(g, ['email', 'email_address', 'u_email']) || '',
        gate: (gateId != null && gateMap[gateId]) ? gateMap[gateId] : (pick(g, ['gate_name', 'gate']) || (gateId != null ? `Gate ${gateId}` : '-')),
        status: normStatus(pick(g, ['duty_status', 'status', 'duty', 'availability'])),
      };
    });

    res.json(guards);
  } catch (err) {
    console.error('listGuards error:', err);
    res.status(500).json({ message: 'Error loading guards.', error: err.message });
  }
}

module.exports = { listGuards };
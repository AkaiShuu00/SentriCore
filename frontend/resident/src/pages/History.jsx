import { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import { getMyRegistrations } from '../api';
import { Search, Archive, CalendarDays } from 'lucide-react';

const FILTERS = ['ALL', 'VISITORS', 'DELIVERIES'];
const DARK = '#0A4A4A';

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

export default function History() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Visit history = completed visits (DEPARTED/EXPIRED) mula DB ──
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRegistrations()
      .then((res) => {
        const regs = res.data || [];
        const rows = [];
        regs.forEach((r) => {
          const isDelivery = r.registration_type === 'Delivery';
          const dateISO = (r.expected_date || '').slice(0, 10);
          const vlist = (r.visitors && r.visitors.length)
            ? r.visitors
            : [{ name: isDelivery ? 'Delivery Rider' : '—', status: r.status }];
          vlist.forEach((v) => {
            const st = (typeof v === 'string' ? (r.status || '') : (v.status || '')).toUpperCase();
            if (st !== 'DEPARTED' && st !== 'EXPIRED') return;  // history = departed/expired lang
            const tIn = typeof v === 'string' ? null : v.timeIn;
            const tOut = typeof v === 'string' ? null : v.timeOut;
            const timeStr = tIn ? `${fmtTime(tIn)}${tOut ? `\nto\n${fmtTime(tOut)}` : ''}` : '';
            rows.push({
              dateISO,
              date: dateISO
                ? new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—',
              time: timeStr,
              departed: tOut ? new Date(tOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
              name: typeof v === 'string' ? v : v.name,
              kind: isDelivery ? 'Delivery' : 'Visitor',
              plate: (typeof v === 'string' ? '' : (v.plate_number || '')),
              status: st,
              entryId: (typeof v === 'string' ? '' : (v.pass_number || '')),
              cat: isDelivery ? 'DELIVERIES' : 'VISITORS',
            });
          });
        });
        setRecords(rows);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    TOTAL: records.length,
    VISITORS: records.filter(r => r.cat === 'VISITORS').length,
    DELIVERIES: records.filter(r => r.cat === 'DELIVERIES').length,
  };

  const statusBg = {
    DEPARTED: { backgroundColor: '#E5E7EB', color: '#6b7280' },
    EXPIRED: { backgroundColor: '#D9D9D9', color: '#555' },
    ACTIVE: { backgroundColor: '#D6EAD9', color: '#1e6b2e' },
  };

  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  // Format YYYY-MM-DD → "Aug 21" (short, clean)
  const fmtShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filtered = records
    .filter(r => filter === 'ALL' || r.cat === filter)
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => {
      if (!fromDate || !toDate) return true;
      const rd = r.dateISO ? new Date(r.dateISO + 'T00:00:00') : null;
      if (!rd) return true;
      const from = new Date(fromDate + 'T00:00:00');
      const to = new Date(toDate + 'T23:59:59');
      return rd >= from && rd <= to;
    });

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto">
      {/* Gradient wave header (walang pangalan) */}
      <PageHeader />

      <div className="px-4 pt-3 relative">
        {/* Teal gradient summary card */}
        <div className="rounded-3xl p-6 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
          <p className="font-bold tracking-wide">{monthYear}</p>
          <h1 className="text-3xl font-extrabold mb-5">Visit History</h1>
          <div className="flex gap-2">
            {[
              { label: 'TOTAL', val: counts.TOTAL },
              { label: 'VISITORS', val: counts.VISITORS },
              { label: 'DELIVERIES', val: counts.DELIVERIES },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-white rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold" style={{ color: DARK }}>{s.val}</p>
                <p className="text-[10px] font-semibold" style={{ color: DARK }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Isang elevated box: search+date → filters → table ── */}
        <div className="bg-white rounded-3xl p-4 shadow mt-4 mb-4">
          {/* Search + date (calendar icon) */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-full px-4 py-3 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={18} className="text-ink/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                     placeholder="Search name"
                     className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
            </div>
            <div className="relative">
              <button onClick={() => setShowCalendar(!showCalendar)}
                      aria-label="Select date"
                      className="flex items-center justify-center rounded-full px-4 shadow-sm h-full"
                      style={{ backgroundColor: fromDate && toDate ? '#0F6E6E' : '#F5F2E9' }}>
                <CalendarDays size={20} style={{ color: fromDate && toDate ? '#fff' : '#0F6E6E' }} />
              </button>
              {showCalendar && (
                <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-4 z-30 w-64 border border-gray-100">
                  <label className="block text-xs font-bold text-ink mb-1">From</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                         className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                  <label className="block text-xs font-bold text-ink mb-1">To</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                         className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => { setFromDate(''); setToDate(''); }}
                            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 font-semibold text-ink">Clear</button>
                    <button onClick={() => setShowCalendar(false)}
                            className="flex-1 text-sm py-2 rounded-xl text-white font-semibold" style={{ backgroundColor: '#0F6E6E' }}>Apply</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mt-3 justify-center">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                      className={`px-5 py-2 rounded-full text-sm font-bold ${filter === f ? 'text-white' : 'bg-white border border-gray-200 text-ink'}`}
                      style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
                {f}
              </button>
            ))}
          </div>

          {/* Table header */}
          <div className="grid grid-cols-4 gap-1 rounded-xl px-3 py-2.5 text-center mt-3" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-xs font-bold" style={{ color: DARK }}>Date & Time</span>
            <span className="text-xs font-bold" style={{ color: DARK }}>Details</span>
            <span className="text-xs font-bold" style={{ color: DARK }}>Status</span>
            <span className="text-xs font-bold" style={{ color: DARK }}>Pass No.</span>
          </div>

          {/* Rows — scrollable */}
          <div className="max-h-[44vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-ink/50">Loading history…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
                <p className="text-ink/60 font-semibold">No visit history yet</p>
                <p className="text-ink/40 text-sm mt-1">Completed visits will appear here once your visitors have checked in and out.</p>
              </div>
            ) : (
              filtered.map((r, i) => (
                <div key={i} className="grid grid-cols-4 gap-1 px-2 py-4 border-b border-gray-100 items-center">
                  {/* Date & Time (+ departed date) */}
                  <div className="text-[10px] text-ink">
                    <p className="font-bold">{r.date}</p>
                    {r.time && <p className="text-ink/60 whitespace-pre-line">{r.time}</p>}
                    {r.departed && <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#0F6E6E' }}>Departed: {r.departed}</p>}
                  </div>
                  {/* Details */}
                  <div className="text-[10px] text-ink">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-ink/60">{r.kind}</p>
                    {r.plate && <p className="text-ink/60">Plate No. {r.plate}</p>}
                  </div>
                  {/* Status */}
                  <div className="text-center">
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={statusBg[r.status]}>{r.status}</span>
                  </div>
                  {/* Pass No. */}
                  <div className="text-[10px] font-bold text-ink text-center">{r.entryId || '—'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav active="history" />
    </div>
  );
}
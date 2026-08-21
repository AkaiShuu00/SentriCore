import { useState } from 'react';
import BottomNav from '../components/BottomNav';

const FILTERS = ['ALL', 'VISITORS', 'DELIVERIES'];

export default function History() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Sample data (ikokonekta sa backend after)
  const records = [
    { date: 'June 2, 2026', time: '6:00 PM to 6:30 PM', name: 'Delivery Rider', vehicle: 'Private Vehicle', kind: 'Delivery', plate: 'HPP 657', status: 'DEPARTED', entryId: 'DLV 260602-1001', cat: 'DELIVERIES' },
    { date: 'June 2, 2026', time: '8:45 PM to 10:23 PM', name: 'Joeffrey Lannister', vehicle: 'Private Vehicle', kind: 'Visitor', plate: 'ATK 999', status: 'DEPARTED', entryId: 'VST 260602-1002', cat: 'VISITORS' },
    { date: 'May 31, 2026', time: '3:00 PM to 8:00 PM', name: 'Maria Santos', vehicle: 'Private Vehicle', kind: 'Visitor', plate: 'ABC 1234', status: 'DEPARTED', entryId: 'VST 260531-1001', cat: 'VISITORS' },
    { date: 'May 7, 2026', time: '8:45 PM to 9:15 PM', name: 'Pedro Pascal', vehicle: 'Private Vehicle', kind: 'Delivery', plate: 'DEF 345', status: 'DEPARTED', entryId: 'DLV 260507-1001', cat: 'DELIVERIES' },
    { date: 'June 1, 2026', time: '-----', name: 'Francesca Fruto', vehicle: '-----', kind: 'Visitor', plate: '-----', status: 'EXPIRED', entryId: 'VST 260601-1001', cat: 'VISITORS' },
  ];

  const counts = {
    TOTAL: records.length,
    VISITORS: records.filter(r => r.cat === 'VISITORS').length,
    DELIVERIES: records.filter(r => r.cat === 'DELIVERIES').length,
  };

  const statusBg = {
    DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
    EXPIRED: { backgroundColor: '#D9D9D9', color: '#555' },
    ACTIVE: { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  };

  const monthYear = 'JUNE 2026';

    // Format YYYY-MM-DD → "Aug 21" (short, clean)
  const fmtShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Convert a record's "June 2, 2026" to a Date for comparison
  const recordDate = (r) => {
    const d = new Date(r.date);
    return isNaN(d) ? null : d;
  };

  const filtered = records
    .filter(r => filter === 'ALL' || r.cat === filter)
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => {
      if (!fromDate || !toDate) return true;
      const rd = recordDate(r);
      if (!rd) return true;
      const from = new Date(fromDate + 'T00:00:00');
      const to = new Date(toDate + 'T23:59:59');
      return rd >= from && rd <= to;
    });

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6">
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-1 pr-5 py-1 shadow">
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center text-xl">👩</div>
          <span className="font-bold text-ink">{user.name || 'Resident'}</span>
        </div>
      </header>

      <div className="px-4">
        {/* Teal gradient summary card */}
        <div className="rounded-3xl p-6 shadow-lg text-white mt-4"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <p className="font-bold tracking-wide">{monthYear}</p>
          <h1 className="text-4xl font-extrabold mb-5">Visit History</h1>
          <div className="flex gap-2">
            {[
              { label: 'TOTAL', val: counts.TOTAL },
              { label: 'VISITORS', val: counts.VISITORS },
              { label: 'DELIVERIES', val: counts.DELIVERIES },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-black/15 rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold">{s.val}</p>
                <p className="text-[10px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search + date range */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow flex-1">
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search name"
                   className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
          </div>
                    <div className="relative">
            <button onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-1 bg-white rounded-full px-3 py-3 shadow text-sm font-semibold text-ink whitespace-nowrap h-full">
                {fromDate && toDate ? `${fmtShort(fromDate)} - ${fmtShort(toDate)}` : 'Select Date' } ▾
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
                          className="flex-1 text-sm py-2 rounded-xl border border-gray-300 font-semibold text-ink">
                    Clear
                  </button>
                  <button onClick={() => setShowCalendar(false)}
                          className="flex-1 text-sm py-2 rounded-xl text-white font-semibold"
                          style={{ backgroundColor: '#0F6E6E' }}>
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 justify-center">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-bold shadow ${filter === f ? 'text-white' : 'bg-white text-ink'}`}
                    style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow mt-4 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-1 bg-gray-100 px-3 py-3 text-center">
            <span className="text-xs font-bold text-ink">Date & Time</span>
            <span className="text-xs font-bold text-ink">Details</span>
            <span className="text-xs font-bold text-ink">Status</span>
            <span className="text-xs font-bold text-ink">Entry ID</span>
          </div>

          {/* Rows */}
          <div className="max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-ink/50 py-8">No records found.</p>
            ) : (
              filtered.map((r, i) => (
                <div key={i} className="grid grid-cols-4 gap-1 px-3 py-4 border-b border-gray-200 items-center">
                  {/* Date & Time */}
                  <div className="text-[10px] text-ink">
                    <p className="font-bold">{r.date}</p>
                    <p className="text-ink/60 whitespace-pre-line">{r.time}</p>
                  </div>
                  {/* Details */}
                  <div className="text-[10px] text-ink">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-ink/60">{r.vehicle} | {r.kind}</p>
                    <p className="text-ink/60">Plate No. {r.plate}</p>
                  </div>
                  {/* Status */}
                  <div className="text-center">
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={statusBg[r.status]}>
                      {r.status}
                    </span>
                  </div>
                  {/* Entry ID */}
                  <div className="text-[10px] font-bold text-ink text-center">{r.entryId}</div>
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
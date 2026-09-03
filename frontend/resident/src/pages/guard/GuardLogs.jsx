import { useState, useEffect } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import { getHistory } from '../../api';

const FILTERS = ['ALL', 'SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];

const statusBg = {
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  EXPIRED:  { backgroundColor: '#D9D9D9', color: '#555' },
};

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';

export default function GuardLogs() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCal, setShowCal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest first');

  // ── History mula DB ──
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((res) => {
        const mapped = (res.data || []).map((t) => {
          const type = (t.registration_type || 'Single').toUpperCase(); // SINGLE/BATCH/DELIVERY
          const prefix = type === 'DELIVERY' ? 'DLV' : type === 'BATCH' ? 'BTC' : 'VST';
          return {
            dateISO: (t.entry_time || t.exit_time || '').slice(0, 10),
            date: t.entry_time ? new Date(t.entry_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-----',
            time: `${fmtTime(t.entry_time)} to ${fmtTime(t.exit_time)}`,
            name: t.visitor_name,
            kind: t.visitor_type || 'Visitor',
            plate: t.plate_number || '',
            resident: t.resident_name || '',
            address: t.unit_address || '',
            status: 'DEPARTED',
            entryId: t.pass_number || `${prefix} ${t.transaction_id}`,
            type,
          };
        });
        setRecords(mapped);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const fmtShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Filtering ──
  let filtered = records
    .filter((r) => filter === 'ALL' || r.type === filter)
    .filter((r) => {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.entryId.toLowerCase().includes(q);
    })
    .filter((r) => {
      if (!fromDate && !toDate) return true;
      const rd = new Date(r.dateISO + 'T00:00:00');
      if (fromDate && rd < new Date(fromDate + 'T00:00:00')) return false;
      if (toDate && rd > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });

  // ── Sorting ──
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'Newest first') return new Date(b.dateISO) - new Date(a.dateISO);
    if (sortBy === 'Oldest first') return new Date(a.dateISO) - new Date(b.dateISO);
    if (sortBy === 'Status') return a.status.localeCompare(b.status);
    if (sortBy === 'Name (A–Z)') return a.name.localeCompare(b.name);
    return 0;
  });

  const counts = {
    TOTAL: filtered.length,
    DEPARTED: filtered.filter((r) => r.status === 'DEPARTED').length,
    EXPIRED: filtered.filter((r) => r.status === 'EXPIRED').length,
  };

  const exportCSV = () => {
    if (filtered.length === 0) { alert('No records to export.'); return; }
    const header = ['Date', 'Time', 'Name', 'Type', 'Plate', 'Resident', 'Address', 'Status', 'Entry ID'];
    const rows = filtered.map((r) => [r.date, r.time, r.name, r.kind, r.plate, r.resident, r.address, r.status, r.entryId]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sentricore-history-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const dateLabel = fromDate && toDate
    ? `${fmtShort(fromDate)} – ${fmtShort(toDate)}`
    : fromDate ? `From ${fmtShort(fromDate)}`
    : toDate ? `Until ${fmtShort(toDate)}`
    : 'All Dates';

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center justify-between">
        <img src="/logo.jpg" alt="SentriCore" className="w-12 h-12 object-contain rounded-full bg-white/10" />
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
          <span className="font-bold text-ink">{user.name || 'Guard'}</span>
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center text-xl">👮</div>
        </div>
      </header>

      <div className="px-4">
        {/* Title + date range */}
        <div className="flex items-start justify-between mt-6 gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">HISTORY LOGS</h1>
            <p className="text-ink/60 text-sm">View and review historical entry records</p>
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setShowCal(!showCal)}
                    className="flex items-center gap-1 bg-white rounded-2xl px-3 py-2 shadow text-xs font-semibold text-ink whitespace-nowrap">
              {dateLabel} ▾
            </button>
            {showCal && (
              <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-lg p-4 z-30 w-64 border border-gray-100">
                <label className="block text-xs font-bold text-ink mb-1">From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                       className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                <label className="block text-xs font-bold text-ink mb-1">To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                       className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => { setFromDate(''); setToDate(''); }}
                          className="flex-1 text-sm py-2 rounded-xl border border-gray-300 font-semibold text-ink">Clear</button>
                  <button onClick={() => setShowCal(false)}
                          className="flex-1 text-sm py-2 rounded-xl text-white font-semibold" style={{ backgroundColor: '#0F6E6E' }}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-xs font-bold shadow shrink-0 ${filter === f ? 'text-white' : 'bg-white text-ink'}`}
                    style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* Summary gradient card */}
        <div className="rounded-3xl p-5 shadow-lg mt-4"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <div className="flex gap-3">
            {[
              { icon: '📋', val: counts.TOTAL, label: 'TOTAL' },
              { icon: '🚶', val: counts.DEPARTED, label: 'DEPARTED' },
              { icon: '⛔', val: counts.EXPIRED, label: 'EXPIRED' },
            ].map((s) => (
              <div key={s.label} className="flex-1 rounded-2xl p-4" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
                <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center text-xl mb-3">{s.icon}</div>
                <p className="text-3xl font-extrabold text-white">{s.val}</p>
                <p className="text-[11px] font-bold text-white/90">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Sort + Export */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow flex-1 min-w-0">
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search" className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow text-sm font-semibold text-ink whitespace-nowrap h-full">
              Sort ▾
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-2 z-30 w-44 border border-gray-100">
                {['Newest first', 'Oldest first', 'Status', 'Name (A–Z)'].map((opt) => (
                  <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }}
                          className={`block w-full text-left px-3 py-2 rounded-xl text-sm ${sortBy === opt ? 'text-white' : 'text-ink hover:bg-gray-50'}`}
                          style={sortBy === opt ? { backgroundColor: '#0F6E6E' } : {}}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={exportCSV}
                  className="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow text-sm font-semibold text-ink whitespace-nowrap shrink-0">
            Export ⬇
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow mt-4 overflow-hidden mb-4">
          <div className="grid grid-cols-5 gap-1 bg-gray-100 px-3 py-3 text-center">
            <span className="text-[10px] font-bold text-ink">Date & Time</span>
            <span className="text-[10px] font-bold text-ink">Details</span>
            <span className="text-[10px] font-bold text-ink">Resident / Location</span>
            <span className="text-[10px] font-bold text-ink">Status</span>
            <span className="text-[10px] font-bold text-ink">Entry ID</span>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-ink/50">Loading history…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">🗂️</p>
                <p className="text-ink/60 font-semibold">No records found</p>
                <p className="text-ink/40 text-sm mt-1">Completed visits will appear here.</p>
              </div>
            ) : (
              filtered.map((r, i) => (
                <div key={i} className="grid grid-cols-5 gap-1 px-3 py-4 border-b border-gray-200 items-center">
                  <div className="text-[9px] text-ink">
                    <p className="font-bold">{r.date}</p>
                    <p className="text-ink/60 whitespace-pre-line">{r.time}</p>
                  </div>
                  <div className="text-[9px] text-ink">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-ink/60">{r.kind}</p>
                    {r.plate && <p className="text-ink/60">Plate No. {r.plate}</p>}
                  </div>
                  <div className="text-[9px] text-ink text-center">
                    <p className="font-bold">{r.resident}</p>
                    <p className="text-ink/60">{r.address}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] font-bold px-2 py-1 rounded-full" style={statusBg[r.status]}>{r.status}</span>
                  </div>
                  <div className="text-[9px] font-bold text-ink text-center">{r.entryId}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <GuardBottomNav active="logs" />
    </div>
  );
}
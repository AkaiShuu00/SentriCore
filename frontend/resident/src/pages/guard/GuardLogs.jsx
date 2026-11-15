import { useState, useEffect } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import PageHeader from '../../components/PageHeader';
import { getHistory, getArrivals, expireCheck } from '../../api';
import { Search, Download, Archive, ArrowDownUp, CalendarDays } from 'lucide-react';

const FILTERS = ['ALL', 'SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];
const DARK = '#0A4A4A';
const TEAL = '#0F6E6E';
const statusBg = {
  ACTIVE:   { backgroundColor: '#D6EAD9', color: '#1e6b2e' },
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  EXPIRED:  { backgroundColor: '#D9D9D9', color: '#555' },
};
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';
const toLocalISO = (ts) => {
  if (!ts) return '';
  const s = String(ts);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) return m[1];
  const d = new Date(s);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const localMinuteKey = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `${toLocalISO(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function GuardLogs() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCal, setShowCal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest first');
  const [linkMode, setLinkMode] = useState('ENTRY');

  const [records, setRecords] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { expireCheck().catch(() => {}); }, []);
  useEffect(() => {
    getArrivals().then((res) => setArrivals((res.data || []).map((t) => ({
      name: t.visitor_name, kind: t.visitor_type || 'Visitor', resident: t.resident_name || '', address: t.unit_address || '',
      status: (t.status || 'Active').toUpperCase(), entryId: t.pass_number || `VST ${t.transaction_id || '—'}`,
      arrivalId: t.arrival_id || null, entryTime: t.entry_time || null, exitTime: t.exit_time || null,
      time: `${fmtTime(t.entry_time)} to ${t.exit_time ? fmtTime(t.exit_time) : '-----'}`, dateISO: toLocalISO(t.entry_time),
    })))).catch(() => setArrivals([]));
  }, []);
  useEffect(() => {
    getHistory().then((res) => {
      setRecords((res.data || []).map((t) => {
        const type = (t.registration_type || 'Single').toUpperCase();
        const prefix = type === 'DELIVERY' ? 'DLV' : type === 'BATCH' ? 'BTC' : 'VST';
        const st = (t.status || 'Departed').toUpperCase();
        return {
          dateISO: toLocalISO(t.entry_time || t.exit_time),
          date: t.entry_time ? new Date(t.entry_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-----',
          time: st === 'EXPIRED' ? 'Did not arrive' : `${fmtTime(t.entry_time)} to ${fmtTime(t.exit_time)}`,
          name: t.visitor_name, kind: t.visitor_type || 'Visitor', plate: t.plate_number || '',
          resident: t.resident_name || '', address: t.unit_address || '', status: st,
          entryId: t.pass_number || `${prefix} ${t.transaction_id || '—'}`, type,
          arrivalId: t.arrival_id || null, linked: !!t.arrival_id, entryTime: t.entry_time || null, exitTime: t.exit_time || null,
        };
      }));
    }).catch(() => setRecords([])).finally(() => setLoading(false));
  }, []);

  const fmtShort = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

  let filtered = records
    .filter((r) => filter === 'ALL' || (filter === 'LINKED' ? r.linked : r.type === filter))
    .filter((r) => { const q = search.toLowerCase(); return r.name.toLowerCase().includes(q) || r.entryId.toLowerCase().includes(q); })
    .filter((r) => {
      if (!fromDate && !toDate) return true;
      const rd = new Date(r.dateISO + 'T00:00:00');
      if (fromDate && rd < new Date(fromDate + 'T00:00:00')) return false;
      if (toDate && rd > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'Newest first') return new Date(b.dateISO) - new Date(a.dateISO);
    if (sortBy === 'Oldest first') return new Date(a.dateISO) - new Date(b.dateISO);
    if (sortBy === 'Status') return a.status.localeCompare(b.status);
    if (sortBy === 'Name (A–Z)') return a.name.localeCompare(b.name);
    return 0;
  });

  const counts = { TOTAL: filtered.length, DEPARTED: filtered.filter((r) => r.status === 'DEPARTED').length, EXPIRED: filtered.filter((r) => r.status === 'EXPIRED').length };

  const buildLinkedGroups = () => {
    const map = new Map();
    if (linkMode === 'ENTRY') {
      arrivals.forEach((r) => { if (!r.arrivalId) return; const k = 'A' + r.arrivalId; if (!map.has(k)) map.set(k, { key: k, when: r.entryTime, members: [] }); map.get(k).members.push(r); });
      let groups = Array.from(map.values()).filter((g) => g.members.length >= 2);
      const q = search.toLowerCase();
      groups = groups.filter((g) => g.members.some((r) => {
        const okQ = !q || r.name.toLowerCase().includes(q) || (r.entryId || '').toLowerCase().includes(q);
        let okD = true;
        if (fromDate || toDate) { const rd = new Date((r.dateISO || '') + 'T00:00:00'); if (fromDate && rd < new Date(fromDate + 'T00:00:00')) okD = false; if (toDate && rd > new Date(toDate + 'T23:59:59')) okD = false; }
        return okQ && okD;
      }));
      groups.forEach((g) => { g.activeCount = g.members.filter((m) => m.status === 'ACTIVE').length; g.members.sort((a, b) => (a.status === b.status ? 0 : a.status === 'ACTIVE' ? -1 : 1)); });
      groups.sort((a, b) => (sortBy === 'Oldest first' ? new Date(a.when) - new Date(b.when) : new Date(b.when) - new Date(a.when)));
      return groups;
    }
    filtered.forEach((r) => { if (r.status !== 'DEPARTED' || !r.exitTime) return; const k = localMinuteKey(r.exitTime); if (!map.has(k)) map.set(k, { key: k, when: r.exitTime, members: [] }); map.get(k).members.push(r); });
    let groups = Array.from(map.values()).filter((g) => g.members.length >= 2);
    groups.forEach((g) => { g.activeCount = 0; });
    groups.sort((a, b) => (sortBy === 'Oldest first' ? new Date(a.when) - new Date(b.when) : new Date(b.when) - new Date(a.when)));
    return groups;
  };
  const linkedGroups = filter === 'LINKED' ? buildLinkedGroups() : [];

  const exportCSV = () => {
    if (filtered.length === 0) { alert('No records to export.'); return; }
    const header = ['Date', 'Time', 'Name', 'Type', 'Plate', 'Resident', 'Address', 'Status', 'Entry ID'];
    const rows = filtered.map((r) => [r.date, r.time, r.name, r.kind, r.plate, r.resident, r.address, r.status, r.entryId]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sentricore-history-logs.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const iconBtn = 'flex items-center justify-center rounded-full w-12 h-12 shrink-0 shadow-sm';

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      <PageHeader />

      <div className="px-4 pt-3 relative">
        {/* Summary — teal gradient, white number boxes */}
        <div className="rounded-3xl p-6 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
          <h1 className="text-3xl font-extrabold mb-5">History Logs</h1>
          <div className="flex gap-2">
            {[['TOTAL', counts.TOTAL], ['DEPARTED', counts.DEPARTED], ['EXPIRED', counts.EXPIRED]].map(([label, val]) => (
              <div key={label} className="flex-1 bg-white rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold" style={{ color: DARK }}>{val}</p>
                <p className="text-[10px] font-semibold" style={{ color: DARK }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter chips — scrollable */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className="px-5 py-2 rounded-full text-xs font-bold shadow-sm shrink-0"
                    style={filter === f ? { backgroundColor: TEAL, color: '#fff' } : { backgroundColor: '#fff', color: DARK }}>
              {f}
            </button>
          ))}
        </div>

        {/* Isang elevated box: search + sort/calendar/export → list */}
        <div className="bg-white rounded-3xl p-4 shadow-lg mt-4 mb-4">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-full px-4 py-3 flex-1 min-w-0" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={18} className="text-ink/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
                     className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
            </div>
            {/* Sort */}
            <div className="relative shrink-0">
              <button onClick={() => setSortOpen(!sortOpen)} aria-label="Sort" className={iconBtn} style={{ backgroundColor: '#F5F2E9' }}>
                <ArrowDownUp size={18} style={{ color: TEAL }} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-2 z-30 w-44 border border-gray-100">
                  {['Newest first', 'Oldest first', 'Status', 'Name (A–Z)'].map((opt) => (
                    <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className={`block w-full text-left px-3 py-2 rounded-xl text-sm ${sortBy === opt ? 'text-white' : 'text-ink hover:bg-gray-50'}`}
                            style={sortBy === opt ? { backgroundColor: TEAL } : {}}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Calendar / date filter */}
            <div className="relative shrink-0">
              <button onClick={() => setShowCal(!showCal)} aria-label="Date" className={iconBtn}
                      style={{ backgroundColor: fromDate || toDate ? TEAL : '#F5F2E9' }}>
                <CalendarDays size={18} style={{ color: fromDate || toDate ? '#fff' : TEAL }} />
              </button>
              {showCal && (
                <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-4 z-30 w-64 border border-gray-100">
                  <label className="block text-xs font-bold text-ink mb-1">From</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                  <label className="block text-xs font-bold text-ink mb-1">To</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-3 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => { setFromDate(''); setToDate(''); }} className="flex-1 text-sm py-2 rounded-xl border border-gray-300 font-semibold text-ink">Clear</button>
                    <button onClick={() => setShowCal(false)} className="flex-1 text-sm py-2 rounded-xl text-white font-semibold" style={{ backgroundColor: TEAL }}>Apply</button>
                  </div>
                </div>
              )}
            </div>
            {/* Export */}
            <button onClick={exportCSV} aria-label="Export" className={iconBtn} style={{ backgroundColor: '#F5F2E9' }}>
              <Download size={18} style={{ color: TEAL }} />
            </button>
          </div>

          {/* LINKED entry/exit toggle */}
          {filter === 'LINKED' && (
            <div className="mt-3">
              <div className="flex gap-2">
                {['ENTRY', 'EXIT'].map((m) => (
                  <button key={m} onClick={() => setLinkMode(m)} className="flex-1 py-2 rounded-full text-xs font-bold"
                          style={linkMode === m ? { backgroundColor: TEAL, color: '#fff' } : { backgroundColor: '#F5F2E9', color: DARK }}>
                    {m === 'ENTRY' ? 'LINKED ENTRY' : 'LINKED EXIT'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LINKED grouped view */}
          {filter === 'LINKED' ? (
            <div className="mt-3 max-h-[48vh] overflow-y-auto space-y-3">
              {loading ? (<div className="text-center py-10 text-ink/50">Loading…</div>)
              : linkedGroups.length === 0 ? (
                <div className="text-center py-10"><div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
                  <p className="text-ink/60 font-semibold">No linked {linkMode === 'ENTRY' ? 'entries' : 'exits'} found</p></div>
              ) : linkedGroups.map((g) => (
                <div key={g.key} className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#E8F0EE' }}>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: TEAL }}>LINKED {linkMode}</span>
                    <span className="text-xs font-bold text-ink">{g.members.length} people{linkMode === 'ENTRY' ? ` · ${g.activeCount} active` : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {g.members.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-2">
                        <div className="min-w-0"><p className="font-bold text-ink text-sm truncate">{r.name}</p>
                          <p className="text-[11px] text-ink/60 truncate">{r.kind} · {r.resident}</p>
                          <p className="text-[11px] text-ink/50">{r.time}</p></div>
                        <div className="text-right shrink-0"><p className="text-[11px] font-bold text-ink">{r.entryId}</p>
                          <span className="text-[8px] font-bold px-2 py-1 rounded-full inline-block mt-1" style={statusBg[r.status]}>{r.status}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-5 gap-1 rounded-xl px-2 py-2.5 text-center" style={{ backgroundColor: '#F5F2E9' }}>
                {['Date & Time', 'Details', 'Resident', 'Status', 'Pass No.'].map((h) => (
                  <span key={h} className="text-[10px] font-bold" style={{ color: DARK }}>{h}</span>
                ))}
              </div>
              <div className="max-h-[48vh] overflow-y-auto">
                {loading ? (<div className="text-center py-10 text-ink/50">Loading…</div>)
                : filtered.length === 0 ? (
                  <div className="text-center py-10"><div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
                    <p className="text-ink/60 font-semibold">No records found</p></div>
                ) : filtered.map((r, i) => (
                  <div key={i} className="grid grid-cols-5 gap-1 px-2 py-4 border-b border-gray-100 items-center">
                    <div className="text-[9px] text-ink"><p className="font-bold">{r.date}</p><p className="text-ink/60 whitespace-pre-line">{r.time}</p></div>
                    <div className="text-[9px] text-ink"><p className="font-bold">{r.name}</p><p className="text-ink/60">{r.kind}</p>{r.plate && <p className="text-ink/60">Plate {r.plate}</p>}</div>
                    <div className="text-[9px] text-ink text-center"><p className="font-bold truncate">{r.resident}</p><p className="text-ink/60 truncate">{r.address}</p></div>
                    <div className="text-center"><span className="text-[8px] font-bold px-2 py-1 rounded-full" style={statusBg[r.status]}>{r.status}</span></div>
                    <div className="text-[9px] font-bold text-ink text-center">{r.entryId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <GuardBottomNav active="logs" />
    </div>
  );
}
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
const fmtFullDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-----';
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

function BatchMemberRow({ r }) {
  return (
    <div className="grid grid-cols-5 gap-1 px-2 py-3 items-center">
      <div className="text-[9px] text-ink"><p className="font-bold">{r.date}</p><p className="text-ink/60">{r.time}</p></div>
      <div className="text-[9px] text-ink"><p className="font-bold">{r.name}</p><p className="text-ink/60">{r.kind}</p>{r.plate && <p className="text-ink/60">Plate {r.plate}</p>}</div>
      <div className="text-[9px] text-ink text-center"><p className="font-bold truncate">{r.resident}</p><p className="text-ink/60 truncate">{r.address}</p></div>
      <div className="text-center"><span className="text-[8px] font-bold px-2 py-1 rounded-full" style={statusBg[r.status]}>{r.status}</span></div>
      <div className="text-[9px] font-bold text-ink text-center">{r.entryId}</div>
    </div>
  );
}

export default function GuardLogs() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCal, setShowCal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest first');
  const [linkMode, setLinkMode] = useState('ENTRY');
  const [openBatch, setOpenBatch] = useState(null);

  const [records, setRecords] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { expireCheck().catch(() => {}); }, []);
  useEffect(() => {
    getArrivals().then((res) => setArrivals((res.data || []).map((t) => ({
      name: t.visitor_name, kind: t.visitor_type || 'Visitor', resident: t.resident_name || '', address: t.unit_address || '',
      status: (t.status || 'Active').toUpperCase(), entryId: t.pass_number || `VST ${t.transaction_id || '—'}`,
      type: (t.registration_type || 'Single').toUpperCase(),
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
          batchName: t.batch_name || '',
          purpose: t.purpose || '',
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
      // Linked = pang-SINGLE visitors lang (hindi kasama ang batch)
      arrivals.filter((r) => r.type !== 'BATCH').forEach((r) => { if (!r.arrivalId) return; const k = 'A' + r.arrivalId; if (!map.has(k)) map.set(k, { key: k, when: r.entryTime, members: [] }); map.get(k).members.push(r); });
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
    // LINKED EXIT = sino ang SABAY lumabas (parehong exit minute), KAHIT hindi sila
    // sabay pumasok. Kaya galing mismo sa `records` (single visitors lang), hindi sa
    // `filtered` na naka-restrict sa may arrival_id lang.
    const q = search.toLowerCase();
    records.filter((r) => r.type !== 'BATCH').forEach((r) => {
      if (r.status !== 'DEPARTED' || !r.exitTime) return;
      const okQ = !q || r.name.toLowerCase().includes(q) || (r.entryId || '').toLowerCase().includes(q);
      let okD = true;
      if (fromDate || toDate) { const rd = new Date((r.dateISO || '') + 'T00:00:00'); if (fromDate && rd < new Date(fromDate + 'T00:00:00')) okD = false; if (toDate && rd > new Date(toDate + 'T23:59:59')) okD = false; }
      if (!okQ || !okD) return;
      const k = localMinuteKey(r.exitTime);
      if (!map.has(k)) map.set(k, { key: k, when: r.exitTime, members: [] });
      map.get(k).members.push(r);
    });
    let groups = Array.from(map.values()).filter((g) => g.members.length >= 2);
    groups.forEach((g) => { g.activeCount = 0; });
    groups.sort((a, b) => (sortBy === 'Oldest first' ? new Date(a.when) - new Date(b.when) : new Date(b.when) - new Date(a.when)));
    return groups;
  };
  const linkedGroups = filter === 'LINKED' ? buildLinkedGroups() : [];

  // BATCH view — pagsama-samahin ang mga magkakabatch, may batch number
  const buildBatchGroups = () => {
    const map = new Map();
    filtered.forEach((r) => {
      const k = r.batchName ? 'B' + r.batchName : 'R' + r.entryId;
      if (!map.has(k)) map.set(k, { key: k, batchNo: r.batchName || '—', members: [] });
      map.get(k).members.push(r);
    });
    const groups = Array.from(map.values());
    groups.forEach((g) => {
      g.when = g.members.reduce((mx, m) => Math.max(mx, new Date(m.entryTime || m.dateISO || 0).getTime() || 0), 0);
      // Arrivals: grupo ayon sa arrival_id (sino ang sabay pumasok)
      const aMap = new Map();
      g.members.filter((m) => m.entryTime).forEach((m) => {
        const ak = m.arrivalId ? 'A' + m.arrivalId : 'S' + m.entryId;
        if (!aMap.has(ak)) aMap.set(ak, { when: m.entryTime, members: [] });
        aMap.get(ak).members.push(m);
      });
      g.arrivals = Array.from(aMap.values()).sort((a, b) => new Date(a.when) - new Date(b.when));
      // Departures: grupo ayon sa exit minute (sino ang sabay lumabas)
      const dMap = new Map();
      g.members.filter((m) => m.status === 'DEPARTED' && m.exitTime).forEach((m) => {
        const dk = localMinuteKey(m.exitTime);
        if (!dMap.has(dk)) dMap.set(dk, { when: m.exitTime, members: [] });
        dMap.get(dk).members.push(m);
      });
      g.departures = Array.from(dMap.values()).sort((a, b) => new Date(a.when) - new Date(b.when));
    });
    groups.sort((a, b) => (sortBy === 'Oldest first' ? a.when - b.when : b.when - a.when));
    return groups;
  };
  const batchGroups = filter === 'BATCH' ? buildBatchGroups() : [];

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
                          <p className="text-[10px] text-ink/70">Pumasok: {fmtFullDate(r.entryTime)}</p>
                          <p className="text-[10px] text-ink/70">Lumabas: {fmtFullDate(r.exitTime)}</p>
                          <p className="text-[11px] text-ink/50">{r.time}</p></div>
                        <div className="text-right shrink-0"><p className="text-[11px] font-bold text-ink">{r.entryId}</p>
                          <span className="text-[8px] font-bold px-2 py-1 rounded-full inline-block mt-1" style={statusBg[r.status]}>{r.status}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filter === 'BATCH' ? (
            <div className="mt-3 max-h-[52vh] overflow-y-auto space-y-3">
              {loading ? (<div className="text-center py-10 text-ink/50">Loading…</div>)
              : batchGroups.length === 0 ? (
                <div className="text-center py-10"><div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
                  <p className="text-ink/60 font-semibold">No batch records found</p></div>
              ) : batchGroups.map((g) => {
                const isOpen = openBatch === g.key;
                const activeCount = g.members.filter((m) => m.status === 'ACTIVE').length;
                return (
                  <div key={g.key} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <button onClick={() => setOpenBatch(isOpen ? null : g.key)}
                            className="w-full flex items-center justify-between px-4 py-3"
                            style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white" style={{ color: DARK }}>BATCH #{g.batchNo}</span>
                        <span className="text-xs font-bold text-white/90 truncate">{g.members[0]?.resident}</span>
                      </div>
                      <span className="text-[11px] font-bold text-white shrink-0">{g.members.length} visitors ▾</span>
                    </button>

                    {isOpen && (
                      <div className="p-3 space-y-3" style={{ backgroundColor: '#F7F5EE' }}>
                        {/* ARRIVALS — sino ang sabay pumasok */}
                        {g.arrivals.map((a, ai) => (
                          <div key={'a' + ai} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: '#1e6b2e' }}>
                              ARRIVAL {ai + 1} - {fmtFullDate(a.when)} - {a.members.length} visitor{a.members.length === 1 ? '' : 's'}
                            </div>
                            <div className="divide-y divide-gray-100">
                              {a.members.map((r, i) => <BatchMemberRow key={i} r={r} />)}
                            </div>
                          </div>
                        ))}
                        {/* DEPARTURES — sino ang sabay lumabas */}
                        {g.departures.map((d, di) => (
                          <div key={'d' + di} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: '#8a2b2b' }}>
                              DEPARTED {di + 1} - {fmtFullDate(d.when)} - {d.members.length} visitor{d.members.length === 1 ? '' : 's'}
                            </div>
                            <div className="divide-y divide-gray-100">
                              {d.members.map((r, i) => <BatchMemberRow key={i} r={r} />)}
                            </div>
                          </div>
                        ))}
                        {activeCount > 0 && (
                          <p className="text-[10px] text-ink/60 text-center">{activeCount} nasa loob pa (active)</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
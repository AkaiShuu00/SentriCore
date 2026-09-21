import { useState, useEffect } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import { getHistory } from '../../api';
import { Shield, ClipboardList, LogOut, Ban, Search, Download, Archive } from 'lucide-react';

const FILTERS = ['ALL', 'SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];

const statusBg = {
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  EXPIRED:  { backgroundColor: '#D9D9D9', color: '#555' },
};

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';

// I-convert ang timestamp patungo sa LOCAL na YYYY-MM-DD (para tugma sa nakikitang petsa
// at sa date filter — iwas sa UTC off-by-one kung saan naiiwan ang mga entry ng unang araw).
const toLocalISO = (ts) => {
  if (!ts) return '';
  const s = String(ts);
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) return dateOnly[1];
  const d = new Date(s);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Local HH:MM key (para sa exit grouping — sino ang magkasabay na lumabas)
const localMinuteKey = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `${toLocalISO(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function GuardLogs() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCal, setShowCal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest first');
  const [linkMode, setLinkMode] = useState('ENTRY'); // para sa LINKED filter: ENTRY o EXIT

  // ── History mula DB ──
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((res) => {
        const mapped = (res.data || []).map((t) => {
          const type = (t.registration_type || 'Single').toUpperCase(); // SINGLE/BATCH/DELIVERY
          const prefix = type === 'DELIVERY' ? 'DLV' : type === 'BATCH' ? 'BTC' : 'VST';
          const st = (t.status || 'Departed').toUpperCase(); // DEPARTED o EXPIRED
          return {
            dateISO: toLocalISO(t.entry_time || t.exit_time),  // LOCAL date (tugma sa display + filter)
            date: t.entry_time ? new Date(t.entry_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-----',
            time: st === 'EXPIRED' ? 'Did not arrive' : `${fmtTime(t.entry_time)} to ${fmtTime(t.exit_time)}`,
            name: t.visitor_name,
            kind: t.visitor_type || 'Visitor',
            plate: t.plate_number || '',
            resident: t.resident_name || '',
            address: t.unit_address || '',
            status: st,
            entryId: t.pass_number || `${prefix} ${t.transaction_id || '—'}`,
            type,
            // Linked info
            arrivalId: t.arrival_id || null,
            linked: !!t.arrival_id,
            entryTime: t.entry_time || null,
            exitTime: t.exit_time || null,
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
    .filter((r) => filter === 'ALL' || (filter === 'LINKED' ? r.linked : r.type === filter))
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

  // ── LINKED grouping ──
  // ENTRY = magkasabay na pumasok (parehong arrival_id)
  // EXIT  = magkasabay na lumabas (parehong petsa+oras ng exit, hanggang minuto)
  const buildLinkedGroups = () => {
    const map = new Map();
    if (linkMode === 'ENTRY') {
      filtered.forEach((r) => {
        if (!r.arrivalId) return;
        const k = 'A' + r.arrivalId;
        if (!map.has(k)) map.set(k, { key: k, when: r.entryTime, members: [] });
        map.get(k).members.push(r);
      });
    } else {
      filtered.forEach((r) => {
        if (r.status !== 'DEPARTED' || !r.exitTime) return;
        const k = localMinuteKey(r.exitTime);
        if (!map.has(k)) map.set(k, { key: k, when: r.exitTime, members: [] });
        map.get(k).members.push(r);
      });
    }
    let groups = Array.from(map.values()).filter((g) => g.members.length >= 2); // 2+ = tunay na linked
    groups.sort((a, b) => (sortBy === 'Oldest first'
      ? new Date(a.when) - new Date(b.when)
      : new Date(b.when) - new Date(a.when)));
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
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center"><Shield size={20} className="text-ink" /></div>
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
              { Icon: ClipboardList, val: counts.TOTAL, label: 'TOTAL' },
              { Icon: LogOut, val: counts.DEPARTED, label: 'DEPARTED' },
              { Icon: Ban, val: counts.EXPIRED, label: 'EXPIRED' },
            ].map((s) => (
              <div key={s.label} className="flex-1 rounded-2xl p-4" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
                <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center mb-3"><s.Icon size={20} className="text-ink" /></div>
                <p className="text-3xl font-extrabold text-white">{s.val}</p>
                <p className="text-[11px] font-bold text-white/90">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Sort + Export */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow flex-1 min-w-0">
            <Search size={18} className="text-ink/40" />
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
            Export <Download size={16} />
          </button>
        </div>

        {/* LINKED: Entry / Exit toggle */}
        {filter === 'LINKED' && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink/60 mb-2">Show linked groups by:</p>
            <div className="flex gap-2">
              {['ENTRY', 'EXIT'].map((m) => (
                <button key={m} onClick={() => setLinkMode(m)}
                        className={`flex-1 py-2 rounded-full text-xs font-bold shadow ${linkMode === m ? 'text-white' : 'bg-white text-ink'}`}
                        style={linkMode === m ? { backgroundColor: '#0F6E6E' } : {}}>
                  {m === 'ENTRY' ? 'LINKED ENTRY' : 'LINKED EXIT'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink/50 mt-2">
              {linkMode === 'ENTRY'
                ? 'Mga taong magkasabay na PUMASOK (iisang arrival).'
                : 'Mga taong magkasabay na LUMABAS (iisang oras ng exit).'}
            </p>
          </div>
        )}

        {/* LINKED grouped view */}
        {filter === 'LINKED' && (
          <div className="mt-4 mb-4 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-ink/50">Loading history…</div>
            ) : linkedGroups.length === 0 ? (
              <div className="bg-white rounded-3xl shadow text-center py-10">
                <div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
                <p className="text-ink/60 font-semibold">No linked {linkMode === 'ENTRY' ? 'entries' : 'exits'} found</p>
                <p className="text-ink/40 text-sm mt-1">Groups of 2+ who {linkMode === 'ENTRY' ? 'entered' : 'exited'} together appear here.</p>
              </div>
            ) : (
              linkedGroups.map((g) => (
                <div key={g.key} className="bg-white rounded-3xl shadow overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#E8F0EE' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#0F6E6E' }}>
                        LINKED {linkMode}
                      </span>
                      <span className="text-xs font-bold text-ink">{g.members.length} people</span>
                    </div>
                    <span className="text-[11px] text-ink/60">
                      {new Date(g.when).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {g.members.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-ink text-sm truncate">{r.name}</p>
                          <p className="text-[11px] text-ink/60 truncate">{r.kind} · {r.resident} · {r.address}</p>
                          <p className="text-[11px] text-ink/50">{r.time}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-ink">{r.entryId}</p>
                          <span className="text-[8px] font-bold px-2 py-1 rounded-full inline-block mt-1" style={statusBg[r.status]}>{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table (SINGLE/BATCH/DELIVERY/ALL) */}
        {filter !== 'LINKED' && (
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
                <div className="flex justify-center mb-2"><Archive size={36} className="text-ink/40" /></div>
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
        )}
      </div>

      <GuardBottomNav active="logs" />
    </div>
  );
}
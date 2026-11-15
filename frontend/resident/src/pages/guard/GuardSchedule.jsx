import { useState, useEffect } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import PageHeader from '../../components/PageHeader';
import { getSchedule } from '../../api';
import { Search, Users, Pencil, Inbox, ArrowDownUp, Maximize2, X } from 'lucide-react';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TABS = ['SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];
const STATUS_TABS = ['ALL', 'ACTIVE', 'EXPECTED', 'DEPARTED'];
const DARK = '#0A4A4A';
const TEAL = '#0F6E6E';

const badgeBg = {
  ACTIVE:   { backgroundColor: '#D6EAD9', color: '#1e6b2e' },
  EXPECTED: { backgroundColor: '#F6E8B0', color: '#8a6d12' },
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
};
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';
const toLocalISO = (val) => {
  if (!val) return '';
  const s = String(val);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) return m[1];
  const d = new Date(s);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function GuardSchedule() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('SINGLE');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Default');
  const [detail, setDetail] = useState(null);
  const [showMonth, setShowMonth] = useState(false);
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getSchedule().then((res) => setSchedule(res.data || [])).catch(() => setSchedule([])).finally(() => setLoading(false));
  }, []);

  const year = today.getFullYear();
  const month = today.getMonth();
  const selectedISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  // Regs para sa napiling araw (base sa expected date)
  const dayRegs = schedule.filter((r) => toLocalISO(r.expectedDate || r.expected_date) === selectedISO);

  const inStatus = (s) => statusFilter === 'ALL' || s === statusFilter;

  // Arrival grouping para sa LINKED (single na sabay dumating)
  const singleArrivalMap = {};
  dayRegs.filter((r) => r.registrationType === 'Single').forEach((r) => {
    r.visitors.forEach((v) => {
      if (!v.arrivalId) return;
      (singleArrivalMap[v.arrivalId] = singleArrivalMap[v.arrivalId] || [])
        .push({ ...v, resident: r.resident, address: r.address, purpose: r.purpose });
    });
  });
  const linkedArrivalIds = new Set(Object.entries(singleArrivalMap).filter(([, v]) => v.length >= 2).map(([k]) => String(k)));
  const inLinkedArrival = (v) => v.arrivalId && linkedArrivalIds.has(String(v.arrivalId));

  // SINGLE rows (hindi kasama ang nasa linked arrival)
  const singleRows = [];
  dayRegs.filter((r) => r.registrationType === 'Single').forEach((r) => {
    r.visitors.filter((v) => !inLinkedArrival(v) && inStatus(v.status)).forEach((v) => {
      singleRows.push({ name: v.name, resident: r.resident, address: r.address, purpose: r.purpose || 'N/A',
        status: v.status, start: v.timeIn ? fmtTime(v.timeIn) : '-----', end: v.timeOut ? fmtTime(v.timeOut) : '' });
    });
  });

  // DELIVERY rows
  const deliveryRows = [];
  dayRegs.filter((r) => r.registrationType === 'Delivery').forEach((r) => {
    r.visitors.filter((v) => inStatus(v.status)).forEach((v) => {
      deliveryRows.push({ name: v.name, resident: r.resident, address: r.address, purpose: r.purpose || 'Delivery',
        status: v.status, start: v.timeIn ? fmtTime(v.timeIn) : '-----', end: v.timeOut ? fmtTime(v.timeOut) : '' });
    });
  });

  // BATCH groups (subset base sa status filter)
  const batchGroups = dayRegs.filter((r) => r.registrationType === 'Batch').map((r) => {
    const vis = r.visitors.filter((v) => inStatus(v.status));
    return { kind: 'batch', id: r.batchName ? `Batch #${r.batchName}` : `BTC ${r.registrationId}`,
      resident: r.resident, address: r.address, purpose: r.purpose,
      active: r.visitors.filter((v) => v.status === 'ACTIVE').length,
      expected: r.visitors.filter((v) => v.status === 'EXPECTED').length,
      departed: r.visitors.filter((v) => v.status === 'DEPARTED').length,
      visitors: vis, filterStatus: statusFilter };
  }).filter((g) => g.visitors.length > 0);

  // LINKED groups
  const linkedGroups = Object.entries(singleArrivalMap).filter(([, v]) => v.length >= 2).map(([key, vis]) => {
    const sub = vis.filter((v) => inStatus(v.status));
    return { kind: 'linked', id: `LNK-${String(key).padStart(5, '0')}`,
      resident: vis[0]?.resident || '', address: vis[0]?.address || '', purpose: vis[0]?.purpose || '',
      active: vis.filter((v) => v.status === 'ACTIVE').length,
      expected: vis.filter((v) => v.status === 'EXPECTED').length,
      departed: vis.filter((v) => v.status === 'DEPARTED').length,
      visitors: sub, filterStatus: statusFilter };
  }).filter((g) => g.visitors.length > 0);

  // Summary (napiling araw)
  const dayVisitors = dayRegs.flatMap((r) => r.visitors);
  const SUMMARY = {
    TOTAL: dayVisitors.length,
    ACTIVE: dayVisitors.filter((v) => v.status === 'ACTIVE').length,
    EXPECTED: dayVisitors.filter((v) => v.status === 'EXPECTED').length,
    DEPARTED: dayVisitors.filter((v) => v.status === 'DEPARTED').length,
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) monthDays.push({ dayNum: i, dayLabel: DAYS[new Date(year, month, i).getDay()] });
  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const scrollDates = (dir) => { const el = document.getElementById('gsched-day-scroll'); if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' }); };
  useEffect(() => { const el = document.getElementById('gsched-today-cell'); if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' }); }, [loading]);

  const matchSearch = (name) => (name || '').toLowerCase().includes(search.toLowerCase());
  const sortList = (list) => {
    if (sortBy === 'Name (A–Z)') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Status') return [...list].sort((a, b) => a.status.localeCompare(b.status));
    return list;
  };
  const singles = sortList(singleRows.filter((e) => matchSearch(e.name)));
  const deliveries = deliveryRows.filter((e) => matchSearch(e.name));
  const batches = batchGroups.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));
  const linked = linkedGroups.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      <PageHeader />

      <div className="px-4 -mt-4 relative">
        {/* Summary — teal gradient, white boxes, teal font */}
        <div className="rounded-3xl p-6 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
          <p className="font-bold tracking-wide">{monthYear.toUpperCase()}</p>
          <h1 className="text-3xl font-extrabold mb-5">Visitors Schedule</h1>
          <div className="flex gap-2">
            {[['TOTAL', SUMMARY.TOTAL], ['ACTIVE', SUMMARY.ACTIVE], ['EXPECTED', SUMMARY.EXPECTED], ['DEPARTED', SUMMARY.DEPARTED]].map(([label, val]) => (
              <div key={label} className="flex-1 bg-white rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold" style={{ color: DARK }}>{val}</p>
                <p className="text-[10px] font-semibold" style={{ color: DARK }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar — may Month Year + Expand */}
        <div className="bg-white rounded-3xl p-4 shadow-lg mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold" style={{ color: DARK }}>{monthYear}</p>
            <button onClick={() => setShowMonth(true)} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
              <Maximize2 size={14} /> Expand
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scrollDates(-1)} className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div id="gsched-day-scroll" className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {monthDays.map((d) => {
                const isActive = d.dayNum === selectedDay;
                const isToday = d.dayNum === today.getDate();
                return (
                  <button key={d.dayNum} id={isToday ? 'gsched-today-cell' : undefined} onClick={() => setSelectedDay(d.dayNum)}
                          className={`flex flex-col items-center rounded-2xl px-3 py-2 min-w-[60px] shadow-sm shrink-0 ${isActive ? 'text-white' : 'text-ink'} ${!isActive && !isToday ? 'bg-white border border-gray-100' : ''}`}
                          style={isActive ? { backgroundColor: TEAL } : isToday ? { backgroundColor: '#CFE3DF' } : {}}>
                    <span className="text-xs font-semibold">{d.dayLabel}</span>
                    <span className="text-2xl font-extrabold">{d.dayNum}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => scrollDates(1)} className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">›</button>
          </div>
        </div>

        {/* Isang elevated box: search+sort → status filters → type tabs → list */}
        <div className="bg-white rounded-3xl p-4 shadow-lg mt-4 mb-4">
          {/* Search + sort icon */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-full px-4 py-3 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={18} className="text-ink/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
                     className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
            </div>
            <div className="relative shrink-0">
              <button onClick={() => setSortOpen(!sortOpen)} aria-label="Sort"
                      className="flex items-center justify-center rounded-full w-12 h-full shadow-sm" style={{ backgroundColor: '#F5F2E9' }}>
                <ArrowDownUp size={18} style={{ color: TEAL }} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-2 z-30 w-40 border border-gray-100">
                  {['Default', 'Name (A–Z)', 'Status'].map((opt) => (
                    <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className={`block w-full text-left px-3 py-2 rounded-xl text-sm ${sortBy === opt ? 'text-white' : 'text-ink hover:bg-gray-50'}`}
                            style={sortBy === opt ? { backgroundColor: TEAL } : {}}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status filter: ACTIVE / EXPECTED / DEPARTED */}
          <div className="flex gap-2 mt-3">
            {STATUS_TABS.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                      className="flex-1 py-1.5 rounded-full text-[11px] font-bold"
                      style={statusFilter === s ? { backgroundColor: TEAL, color: '#fff' } : { backgroundColor: '#fff', color: DARK, border: '1px solid #e5e7eb' }}>
                {s}
              </button>
            ))}
          </div>

          {/* Type tabs: even spaces */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                      className="py-2 rounded-full text-[11px] font-bold"
                      style={tab === t ? { backgroundColor: DARK, color: '#fff' } : { backgroundColor: '#F5F2E9', color: DARK }}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'LINKED' && (
            <div className="mt-3 rounded-2xl px-4 py-2 text-center text-[11px] font-medium" style={{ backgroundColor: '#DCF3E4', color: '#1e6b2e' }}>
              Single visitors who arrived together (same arrival).
            </div>
          )}

          {/* LIST */}
          <div className="mt-3 max-h-[46vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-ink/50">Loading…</div>
            ) : (
              <>
                {tab === 'SINGLE' && (singles.length === 0 ? <EmptyState /> : singles.map((e, i) => <SingleRow key={i} e={e} />))}
                {tab === 'DELIVERY' && (deliveries.length === 0 ? <EmptyState /> : deliveries.map((e, i) => <SingleRow key={i} e={e} delivery />))}
                {tab === 'BATCH' && (batches.length === 0 ? <EmptyState /> : batches.map((g) => <GroupCard key={g.id} g={g} label="Visitors" onOpen={() => setDetail(g)} />))}
                {tab === 'LINKED' && (linked.length === 0 ? <EmptyState /> : linked.map((g) => <GroupCard key={g.id} g={g} label="Linked" onOpen={() => setDetail(g)} />))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Month expand modal */}
      {showMonth && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setShowMonth(false)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowMonth(false)} className="absolute top-4 right-4 text-ink/50"><X size={20} /></button>
            <h3 className="text-lg font-extrabold mb-4 text-center" style={{ color: DARK }}>{monthYear}</h3>
            <div className="grid grid-cols-7 gap-1 mb-1">{DAYS.map((d) => <div key={d} className="text-center text-[10px] font-bold text-ink/50 py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => <div key={`b${i}`} />)}
              {monthDays.map((d) => {
                const isActive = d.dayNum === selectedDay;
                const isToday = d.dayNum === today.getDate();
                return (
                  <button key={d.dayNum} onClick={() => { setSelectedDay(d.dayNum); setShowMonth(false); }}
                          className={`aspect-square rounded-xl text-sm font-bold flex items-center justify-center ${isActive ? 'text-white' : 'text-ink'}`}
                          style={isActive ? { backgroundColor: TEAL } : isToday ? { backgroundColor: '#CFE3DF' } : { backgroundColor: '#F5F2E9' }}>
                    {d.dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {detail && <DetailModal group={detail} onClose={() => setDetail(null)} />}
      <GuardBottomNav active="schedule" />
    </div>
  );
}

function SingleRow({ e, delivery }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
        {e.start}{e.end && <><br />to<br />{e.end}</>}
      </div>
      <div className="flex-1 border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink text-sm">{e.name}</p>
          <p className="text-xs text-ink/60 truncate">{e.resident} | {e.address}</p>
          <p className="text-xs text-ink/60">{delivery ? 'Type: Delivery' : `Purpose: ${e.purpose}`}</p>
        </div>
        <span className="text-[9px] font-bold px-3 py-1 rounded-full whitespace-nowrap" style={badgeBg[e.status]}>{e.status}</span>
      </div>
    </div>
  );
}

function GroupBadges({ g }) {
  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      <MiniBadge n={g.active} label="Active" color="#D6EAD9" />
      {g.kind === 'batch' && <MiniBadge n={g.expected} label="Expected" color="#F6E8B0" />}
      <MiniBadge n={g.departed} label="Departed" color="#F3C9C9" />
    </div>
  );
}
function MiniBadge({ n, label, color }) {
  return <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: color, color: '#333' }}>{n} {label}</span>;
}
function GroupCard({ g, label, onOpen }) {
  return (
    <button onClick={onOpen} className="w-full text-left border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center"><Users size={20} className="text-ink" /></div>
        <p className="text-lg font-extrabold text-ink mt-1 leading-none">{g.visitors.length}</p>
        <p className="text-[10px] text-ink/60">{label}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-ink text-sm mb-1">{g.id}</p>
        <p className="text-xs text-ink/70"><span className="font-bold">Resident:</span> {g.resident}</p>
        {g.purpose && <p className="text-xs text-ink/70"><span className="font-bold">Purpose:</span> {g.purpose}</p>}
        <p className="text-xs text-ink/70 truncate"><span className="font-bold">Address:</span> {g.address}</p>
        <GroupBadges g={g} />
      </div>
      <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center shrink-0 self-end"><Pencil size={16} /></div>
    </button>
  );
}

function DetailModal({ group, onClose }) {
  const isLinked = group.kind === 'linked';
  const fs = group.filterStatus || 'ALL';
  const show = (s) => fs === 'ALL' || fs === s;
  const activeVisitors = group.visitors.filter((v) => v.status === 'ACTIVE');
  const arrMap = {};
  activeVisitors.forEach((v) => {
    const key = v.arrivalId || ('solo-' + v.name);
    (arrMap[key] = arrMap[key] || { arrivalId: v.arrivalId, timeIn: v.timeIn, visitors: [] }).visitors.push(v);
  });
  const arrivals = Object.values(arrMap);
  const expectedMembers = group.visitors.filter((v) => v.status === 'EXPECTED');
  const departedMembers = group.visitors.filter((v) => v.status === 'DEPARTED');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-ink text-center mb-3">{group.id}</h2>
        <hr className="border-gray-200 mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center"><Users size={20} className="text-ink" /></div>
            <p className="text-lg font-extrabold text-ink mt-1 leading-none">{group.visitors.length}</p>
            <p className="text-[10px] text-ink/60">{isLinked ? 'Linked' : 'Visitors'}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink/70"><span className="font-bold">Resident:</span> {group.resident}</p>
            {group.purpose && <p className="text-xs text-ink/70"><span className="font-bold">Purpose:</span> {group.purpose}</p>}
            <p className="text-xs text-ink/70 truncate"><span className="font-bold">Address:</span> {group.address}</p>
            <GroupBadges g={group} />
          </div>
        </div>

        {show('ACTIVE') && arrivals.map((a, idx) => (
          <div key={a.arrivalId || idx} className="mb-4">
            <div className="bg-ink text-white rounded-xl px-3 py-2 flex items-center justify-between mb-2">
              <span className="text-xs font-bold">ARRIVAL {idx + 1}</span>
              <span className="text-[10px] opacity-80">Time in: {fmtTime(a.timeIn)}</span>
            </div>
            {a.visitors.map((v, i) => (
              <div key={v.name} className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2 mb-2">
                <span className="text-sm text-ink">{i + 1}. {v.name}</span>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={badgeBg.ACTIVE}>ACTIVE</span>
              </div>
            ))}
          </div>
        ))}

        {show('EXPECTED') && expectedMembers.length > 0 && (
          <>
            <h3 className="text-center text-base font-extrabold text-ink mb-3">EXPECTED VISITORS</h3>
            {expectedMembers.map((v) => (
              <div key={v.name} className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2 mb-2">
                <span className="text-sm text-ink">{v.name}</span>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={badgeBg.EXPECTED}>EXPECTED</span>
              </div>
            ))}
          </>
        )}

        {show('DEPARTED') && departedMembers.length > 0 && (
          <>
            <h3 className="text-center text-sm font-extrabold text-ink/60 mb-2">DEPARTED</h3>
            {departedMembers.map((v) => (
              <div key={v.name} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2 mb-2">
                <span className="text-sm text-ink/60">{v.name}</span>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={badgeBg.DEPARTED}>DEPARTED</span>
              </div>
            ))}
          </>
        )}

        <button onClick={onClose} className="w-full mt-2 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">CLOSE</button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-2"><Inbox size={36} className="text-ink/40" /></div>
      <p className="text-ink/60 font-semibold">No entries here</p>
      <p className="text-ink/40 text-sm mt-1">Registrations will appear here.</p>
    </div>
  );
}
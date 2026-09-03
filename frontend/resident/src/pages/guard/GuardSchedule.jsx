import { useState, useEffect } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import { getActiveVisitors } from '../../api';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TABS = ['SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];

const badgeBg = {
  ACTIVE:   { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  EXPECTED: { backgroundColor: '#F1D88A', color: '#8a6d12' },
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
};

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';

export default function GuardSchedule() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('SINGLE');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Default');
  const [detail, setDetail] = useState(null);
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // ── Active data mula DB ──
  const [activeDB, setActiveDB] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveVisitors()
      .then((res) => setActiveDB(res.data || []))
      .catch(() => setActiveDB([]))
      .finally(() => setLoading(false));
  }, []);

  // Map DB rows → common shape
  const rows = activeDB.map((t) => ({
    transactionId: t.transaction_id,
    name: t.visitor_name,
    type: t.visitor_type || 'Visitor',
    purpose: t.purpose || 'N/A',
    resident: t.resident_name || '',
    address: t.unit_address || '',
    start: fmtTime(t.entry_time),
    end: '-----',
    status: 'ACTIVE',
    arrivalId: t.arrival_id,
    regType: t.registration_type,
    registrationId: t.registration_id,
    passNumber: t.pass_number,
    plate: t.plate_number,
  }));

  const isDeliveryRow = (r) => r.type === 'Delivery' || r.type === 'Driver' || r.regType === 'Delivery';
  const deliveryRows = rows.filter(isDeliveryRow);
  const nonDelivery = rows.filter((r) => !isDeliveryRow(r));

  // BATCH: regType Batch, group by registrationId
  const batchMap = {};
  nonDelivery.filter((r) => r.regType === 'Batch').forEach((r) => {
    const key = r.registrationId || r.arrivalId || r.name;
    (batchMap[key] = batchMap[key] || []).push(r);
  });
  const batchGroups = Object.entries(batchMap).map(([key, vis]) => ({
    kind: 'batch',
    id: 'BTC ' + String(key),
    resident: vis[0].resident,
    address: vis[0].address,
    purpose: vis[0].purpose,
    active: vis.length, expected: 0, departed: 0,
    visitors: vis.map((v) => ({ name: v.name, start: v.start, status: 'ACTIVE' })),
  }));

  // LINKED: non-batch, may arrival_id, 2+ na magkasama
  const linkedMap = {};
  nonDelivery.filter((r) => r.regType !== 'Batch' && r.arrivalId).forEach((r) => {
    (linkedMap[r.arrivalId] = linkedMap[r.arrivalId] || []).push(r);
  });
  const linkedGroups = Object.entries(linkedMap)
    .filter(([, vis]) => vis.length >= 2)
    .map(([key, vis]) => ({
      kind: 'linked',
      id: 'LNK ' + String(key),
      resident: vis[0].resident,
      address: vis[0].address,
      active: vis.length, expected: 0, departed: 0,
      visitors: vis.map((v) => ({ name: v.name, start: v.start, end: v.end, type: v.type, purpose: v.purpose, status: 'ACTIVE' })),
    }));
  const linkedArrivalIds = new Set(
    Object.entries(linkedMap).filter(([, v]) => v.length >= 2).map(([k]) => k)
  );

  // SINGLE: non-delivery, non-batch, hindi kasama sa linked group
  const singleRows = nonDelivery.filter(
    (r) => r.regType !== 'Batch' && !(r.arrivalId && linkedArrivalIds.has(String(r.arrivalId)))
  );

  // Summary counts (ACTIVE mula DB; EXPECTED/DEPARTED = kailangan ng endpoint)
  const SUMMARY = { TOTAL: rows.length, ACTIVE: rows.length, EXPECTED: 0, DEPARTED: 0 };

  // Day strip
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    monthDays.push({ dayNum: i, dayLabel: DAYS[d.getDay()] });
  }
  const monthYear = today.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  const scrollDates = (dir) => {
    const el = document.getElementById('gsched-day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  const matchSearch = (name) => (name || '').toLowerCase().includes(search.toLowerCase());
  const sortList = (list) => {
    if (sortBy === 'Name (A–Z)') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Status') return [...list].sort((a, b) => a.status.localeCompare(b.status));
    return list;
  };

  const singles = sortList(singleRows.filter((e) => matchSearch(e.name)));
  const deliveries = deliveryRows.filter((e) => matchSearch(e.name) || matchSearch(e.passNumber));
  const batches = batchGroups.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));
  const linked = linkedGroups.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));

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
        {/* Summary gradient card */}
        <div className="rounded-3xl p-6 shadow-lg text-white mt-4"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <p className="font-bold tracking-wide">{monthYear}</p>
          <h1 className="text-3xl font-extrabold mb-5">TODAY'S SCHEDULE</h1>
          <div className="flex gap-2">
            {[
              { label: 'TOTAL', val: SUMMARY.TOTAL },
              { label: 'ACTIVE', val: SUMMARY.ACTIVE },
              { label: 'EXPECTED', val: SUMMARY.EXPECTED },
              { label: 'DEPARTED', val: SUMMARY.DEPARTED },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-black/15 rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold">{s.val}</p>
                <p className="text-[10px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Day calendar */}
        <div className="bg-white rounded-3xl p-4 shadow mt-5">
          <div className="flex items-center gap-2">
            <button onClick={() => scrollDates(-1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div id="gsched-day-scroll" className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {monthDays.map((d) => {
                const isActive = d.dayNum === selectedDay;
                return (
                  <button key={d.dayNum} onClick={() => setSelectedDay(d.dayNum)}
                          className={`flex flex-col items-center rounded-2xl px-3 py-2 min-w-[60px] shadow shrink-0 ${isActive ? 'text-white' : 'bg-white text-ink border border-gray-100'}`}
                          style={isActive ? { backgroundColor: '#0F6E6E' } : {}}>
                    <span className="text-xs font-semibold">{d.dayLabel}</span>
                    <span className="text-2xl font-extrabold">{d.dayNum}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => scrollDates(1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">›</button>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow flex-1">
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search" className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent w-full" />
          </div>
          <div className="relative">
            <button onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow text-sm font-semibold text-ink whitespace-nowrap h-full">
              Sort ▾
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-14 bg-white rounded-2xl shadow-lg p-2 z-30 w-40 border border-gray-100">
                {['Default', 'Name (A–Z)', 'Status'].map((opt) => (
                  <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }}
                          className={`block w-full text-left px-3 py-2 rounded-xl text-sm ${sortBy === opt ? 'text-white' : 'text-ink hover:bg-gray-50'}`}
                          style={sortBy === opt ? { backgroundColor: '#0F6E6E' } : {}}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info banner (LINKED only) */}
        {tab === 'LINKED' && (
          <div className="mt-4 rounded-2xl px-4 py-3 text-center text-xs font-medium"
               style={{ backgroundColor: '#DCF3E4', color: '#1e6b2e' }}>
            Linked registrations are for single visitors who arrived together and
            same-day deliveries for entry and exit monitoring purposes.
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-2 rounded-full text-xs font-bold shadow shrink-0 ${tab === t ? 'text-white' : 'bg-white text-ink'}`}
                    style={tab === t ? { backgroundColor: '#0F6E6E' } : {}}>
              {t}
            </button>
          ))}
        </div>

        {/* ── LIST AREA ── */}
        <div className="mt-4">
          {loading ? (
            <div className="bg-white rounded-3xl p-4 shadow text-center py-10 text-ink/50">Loading…</div>
          ) : (
            <>
              {tab === 'SINGLE' && (
                <div className="bg-white rounded-3xl p-4 shadow">
                  {singles.length === 0 ? <EmptyState /> : singles.map((e, i) => <SingleRow key={i} e={e} />)}
                  <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
                </div>
              )}

              {tab === 'DELIVERY' && (
                <div className="bg-white rounded-3xl p-4 shadow">
                  {deliveries.length === 0 ? <EmptyState /> : deliveries.map((e, i) => <DeliveryRow key={i} e={e} />)}
                  <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
                </div>
              )}

              {tab === 'BATCH' && (
                <div className="bg-white rounded-3xl p-4 shadow">
                  {batches.length === 0 ? <EmptyState /> : batches.map((g) => (
                    <GroupCard key={g.id} g={g} label="Visitors" onOpen={() => setDetail(g)} />
                  ))}
                  <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
                </div>
              )}

              {tab === 'LINKED' && (
                <div className="bg-white rounded-3xl p-4 shadow">
                  {linked.length === 0 ? <EmptyState /> : linked.map((g) => (
                    <GroupCard key={g.id} g={g} label="Linked" onOpen={() => setDetail(g)} />
                  ))}
                  <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detail && <DetailModal group={detail} onClose={() => setDetail(null)} />}

      <GuardBottomNav active="schedule" />
    </div>
  );
}

function SingleRow({ e }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
        {e.start}
        {e.end && <><br />to<br />{e.end}</>}
      </div>
      <div className="flex-1 border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div>
          <p className="font-bold text-ink text-sm">{e.name}</p>
          <p className="text-xs text-ink/60">{e.resident} | {e.address}</p>
          <p className="text-xs text-ink/60">Purpose: {e.purpose}</p>
        </div>
        <span className="text-[9px] font-bold px-3 py-1 rounded-full whitespace-nowrap" style={badgeBg[e.status]}>
          {e.status}
        </span>
      </div>
    </div>
  );
}

function DeliveryRow({ e }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
        {e.start}
        {e.end && <><br />to<br />{e.end}</>}
      </div>
      <div className="flex-1 border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div>
          <p className="font-bold text-ink text-sm">{e.passNumber || 'Delivery'}</p>
          <p className="text-xs text-ink/60">Rider Name: {e.name}</p>
          <p className="text-xs text-ink/60">Resident Name: {e.resident}</p>
          <p className="text-xs text-ink/60">Address: {e.address}</p>
        </div>
        <span className="text-[9px] font-bold px-3 py-1 rounded-full whitespace-nowrap" style={badgeBg[e.status]}>
          {e.status}
        </span>
      </div>
    </div>
  );
}

function GroupBadges({ g }) {
  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      <MiniBadge n={g.active} label="Active" color="#B4E4BE" />
      {g.kind === 'batch' && <MiniBadge n={g.expected} label="Expected" color="#F1D88A" />}
      <MiniBadge n={g.departed} label="Departed" color="#F3C9C9" />
    </div>
  );
}

function GroupCard({ g, label, onOpen }) {
  return (
    <button onClick={onOpen} className="w-full text-left border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-lg">👥</div>
        <p className="text-lg font-extrabold text-ink mt-1 leading-none">{g.visitors.length}</p>
        <p className="text-[10px] text-ink/60">{label}</p>
      </div>
      <div className="flex-1">
        <p className="font-extrabold text-ink text-sm mb-1">{g.id}</p>
        <p className="text-xs text-ink/70"><span className="font-bold">Resident:</span> {g.resident}</p>
        {g.purpose && <p className="text-xs text-ink/70"><span className="font-bold">Purpose:</span> {g.purpose}</p>}
        <p className="text-xs text-ink/70"><span className="font-bold">Address:</span> {g.address}</p>
        <GroupBadges g={g} />
      </div>
      <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center shrink-0 self-end">✎</div>
    </button>
  );
}

function MiniBadge({ n, label, color }) {
  return (
    <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: color, color: '#333' }}>
      {n} {label}
    </span>
  );
}

function DetailModal({ group, onClose }) {
  const isLinked = group.kind === 'linked';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-ink text-center mb-3">{group.id}</h2>
        <hr className="border-gray-200 mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-lg">👥</div>
            <p className="text-lg font-extrabold text-ink mt-1 leading-none">{group.visitors.length}</p>
            <p className="text-[10px] text-ink/60">{isLinked ? 'Linked' : 'Visitors'}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink/70"><span className="font-bold">Resident:</span> {group.resident}</p>
            {group.purpose && <p className="text-xs text-ink/70"><span className="font-bold">Purpose:</span> {group.purpose}</p>}
            <p className="text-xs text-ink/70"><span className="font-bold">Address:</span> {group.address}</p>
            <GroupBadges g={group} />
          </div>
        </div>

        <hr className="border-gray-200 mb-3" />
        <h3 className="text-center text-base font-extrabold text-ink mb-3">
          {isLinked ? 'LINKED VISITORS' : 'BATCH VISITORS'}
        </h3>

        <div className="max-h-[38vh] overflow-y-auto">
          {group.visitors.map((v, i) => (
            isLinked ? (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="text-xs font-bold text-ink text-center w-14 shrink-0 leading-tight">
                  {v.start}<br />to<br />{v.end || '-----'}
                </div>
                <div className="flex-1 border border-gray-200 rounded-xl p-3">
                  <p className="font-bold text-ink text-sm">{v.name}</p>
                  <p className="text-xs text-ink/60">{v.type || 'Visitor'}</p>
                  <p className="text-xs text-ink/60">Purpose: {v.purpose || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100">
                <span className="text-xs font-bold text-ink w-14 shrink-0 text-center">{v.start || '-----'}</span>
                <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-ink">{v.name}</span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={badgeBg.ACTIVE}>ACTIVE</span>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
                  className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-4xl mb-2">📭</p>
      <p className="text-ink/60 font-semibold">No entries here</p>
      <p className="text-ink/40 text-sm mt-1">Approved entries will appear here.</p>
    </div>
  );
}
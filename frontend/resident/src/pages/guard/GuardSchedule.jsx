import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TABS = ['SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];

// ── Status badge colors (design system) ──
const badgeBg = {
  ACTIVE:   { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  EXPECTED: { backgroundColor: '#F1D88A', color: '#8a6d12' },
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA (community-wide — papalitan ng backend after)
// ─────────────────────────────────────────────────────────────────────────────
const RESIDENT = 'Reina Magpantay';
const ADDRESS  = '207 Gemini St. Block A';

const SINGLE_ENTRIES = [
  { start: '2:00 PM', end: '-----',   name: 'Joshua Mina',       resident: RESIDENT, address: ADDRESS, purpose: 'Visiting a friend', status: 'ACTIVE'   },
  { start: '-----',   end: '',        name: 'Juan Dela Cruz',    resident: RESIDENT, address: ADDRESS, purpose: 'Visiting a friend', status: 'EXPECTED' },
  { start: '-----',   end: '',        name: 'Adrianne Pawhay',   resident: RESIDENT, address: ADDRESS, purpose: 'N/A',               status: 'EXPECTED' },
  { start: '-----',   end: '',        name: 'Naveah Lim',        resident: RESIDENT, address: ADDRESS, purpose: 'Casual visit',      status: 'EXPECTED' },
  { start: '-----',   end: '',        name: 'Delia Samaco',      resident: RESIDENT, address: ADDRESS, purpose: 'Family gathering',  status: 'EXPECTED' },
  { start: '8:45 PM', end: '10:23 PM',name: 'Joeffrey Lannister',resident: RESIDENT, address: ADDRESS, purpose: 'N/A',               status: 'DEPARTED' },
];

// BATCH — expected pa (hindi pa dumarating), kaya names lang + VERIFY ENTRY/EXIT
const BATCH_GROUPS = [
  {
    kind: 'batch',
    id: 'BTC 260602-1001',
    resident: RESIDENT,
    address: ADDRESS,
    purpose: 'Birthday celebration',
    active: 0, expected: 6, departed: 0,
    visitors: [
      { name: 'Tony Hawk',        start: '-----', status: 'EXPECTED' },
      { name: 'Madeleine Mina',   start: '-----', status: 'EXPECTED' },
      { name: 'Angel Libunao',    start: '-----', status: 'EXPECTED' },
      { name: 'Love Licuanan',    start: '-----', status: 'EXPECTED' },
      { name: 'Jericho Gonzales', start: '-----', status: 'EXPECTED' },
      { name: 'Jefferson Moong',  start: '-----', status: 'EXPECTED' },
    ],
  },
];

// LINKED — single visitors na sabay dumating (same arrival time), active na
const LINKED_GROUPS = [
  {
    kind: 'linked',
    id: 'LNK 260602-2001',
    resident: 'Marina Lewis',
    address: '34 Cancer St.',
    active: 3, expected: 0, departed: 0,
    visitors: [
      { name: 'Jon Snow',           start: '10:14 AM', end: '-----', type: 'Visitor', purpose: 'Board night', status: 'ACTIVE' },
      { name: 'Rhaenyra Targaryen', start: '10:14 AM', end: '-----', type: 'Visitor', purpose: 'Board night', status: 'ACTIVE' },
      { name: 'Theon Greyjoy',      start: '10:14 AM', end: '-----', type: 'Visitor', purpose: 'Board night', status: 'ACTIVE' },
    ],
  },
];

const DELIVERY_ENTRIES = [
  {
    start: '-----', end: '',
    dlvId: '',
    orderId: 'PH 268358905823K',
    rider: 'N/A',
    resident: RESIDENT, address: ADDRESS,
    status: 'EXPECTED',
  },
  {
    start: '6:00 PM', end: '6:30 PM',
    dlvId: 'DLV 260602-3001',
    orderId: 'PH 88392038572',
    rider: 'Delivery Rider',
    resident: RESIDENT, address: ADDRESS,
    status: 'DEPARTED',
  },
];

// Summary stats (community-wide — hardcoded muna para tumugma sa design)
const SUMMARY = { TOTAL: 17, ACTIVE: 4, EXPECTED: 11, DEPARTED: 2 };

// ─────────────────────────────────────────────────────────────────────────────
export default function GuardSchedule() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('SINGLE');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Default');
  const [detail, setDetail] = useState(null);
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

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

  const matchSearch = (name) => name.toLowerCase().includes(search.toLowerCase());

  const sortList = (list) => {
    if (sortBy === 'Name (A–Z)') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Status') return [...list].sort((a, b) => a.status.localeCompare(b.status));
    return list;
  };

  const singles = sortList(SINGLE_ENTRIES.filter((e) => matchSearch(e.name)));
  const deliveries = DELIVERY_ENTRIES.filter((e) =>
    matchSearch(e.rider) || matchSearch(e.orderId) || matchSearch(e.dlvId || '')
  );
  const batches = BATCH_GROUPS.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));
  const linked = LINKED_GROUPS.filter((g) => matchSearch(g.id) || g.visitors.some((v) => matchSearch(v.name)));

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center justify-between">
        <img src="/logo.jpg" alt="SentriCore" className="w-12 h-12 object-contain rounded-full bg-white/10" />
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
          <span className="font-bold text-ink">{user.name || 'Guard One'}</span>
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
        </div>
      </div>

      {/* Detail modal */}
      {detail && <DetailModal group={detail} onClose={() => setDetail(null)} />}

      {/* Bottom nav (guard) */}
      <GuardBottomNav active="schedule" />
    </div>
  );
}

// ── Single / Delivery row ──
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

// ── Delivery row ──
function DeliveryRow({ e }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
        {e.start}
        {e.end && <><br />to<br />{e.end}</>}
      </div>
      <div className="flex-1 border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div>
          {e.dlvId
            ? <p className="font-bold text-ink text-sm">{e.dlvId}</p>
            : <p className="font-bold text-ink text-sm">-</p>}
          <p className="text-xs text-ink/60">Order ID: {e.orderId}</p>
          <p className="text-xs text-ink/60">Rider Name: {e.rider}</p>
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

// ── Group summary badges (batch = 3, linked = Active/Departed) ──
function GroupBadges({ g }) {
  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      <MiniBadge n={g.active} label="Active" color="#B4E4BE" />
      {g.kind === 'batch' && <MiniBadge n={g.expected} label="Expected" color="#F1D88A" />}
      <MiniBadge n={g.departed} label="Departed" color="#F3C9C9" />
    </div>
  );
}

// ── Batch / Linked summary card ──
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

// ── Detail modal (batch / linked) ──
function DetailModal({ group, onClose }) {
  const isLinked = group.kind === 'linked';
  const anyActive = group.visitors.some((v) => v.status === 'ACTIVE');
  const anyExpected = group.visitors.some((v) => v.status === 'EXPECTED');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-ink text-center mb-3">{group.id}</h2>
        <hr className="border-gray-200 mb-4" />

        {/* Group summary */}
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
          {isLinked ? 'LINKED VISITORS' : 'EXPECTED VISITORS'}
        </h3>

        <div className="max-h-[38vh] overflow-y-auto">
          {group.visitors.map((v, i) => (
            isLinked ? (
              // LINKED row — full details (time, type, purpose)
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
              // BATCH row — name only
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100">
                <span className="text-xs font-bold text-ink w-14 shrink-0 text-center">{v.start || '-----'}</span>
                <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2">
                  <span className="text-sm text-ink">{v.name}</span>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Buttons — linked (active) = VERIFY EXIT only; batch = both */}
        <div className="flex gap-3 mt-5">
          {isLinked ? (
            <button onClick={() => alert('Verify Exit')}
                    className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#112D31' }}>
              VERIFY EXIT
            </button>
          ) : (
            <>
              <button onClick={() => alert('Verify Exit')}
                      className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">
                VERIFY EXIT
              </button>
              <button onClick={() => alert('Verify Entry')}
                      className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#112D31' }}>
                VERIFY ENTRY
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-4xl mb-2">📭</p>
      <p className="text-ink/60 font-semibold">No entries here</p>
      <p className="text-ink/40 text-sm mt-1">Entries will appear here.</p>
    </div>
  );
}
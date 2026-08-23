import { useState } from 'react';
import BottomNav from '../components/BottomNav';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FILTERS = ['ALL', 'ACTIVE', 'EXPECTED', 'DEPARTED'];

export default function Schedule() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // ── Real data: pre-registered visitors (galing sa PreRegister → localStorage) ──
  const registered = JSON.parse(localStorage.getItem('sentricore_expected') || '[]');
  const items = registered.map((r) => ({
    start: '-----',
    end: '',
    name: r.name,
    type: r.regType === 'Delivery' ? 'Delivery' : 'Visitor',
    purpose: r.purpose || (r.regType === 'Delivery' ? 'Delivery' : 'N/A'),
    status: 'EXPECTED',
  }));

  const counts = {
    TOTAL: items.length,
    ACTIVE: items.filter(i => i.status === 'ACTIVE').length,
    EXPECTED: items.filter(i => i.status === 'EXPECTED').length,
    DEPARTED: items.filter(i => i.status === 'DEPARTED').length,
  };

  // Build ALL days of the current month with correct day labels (scrollable)
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    monthDays.push({ dayNum: i, dayLabel: DAYS[dateObj.getDay()] });
  }

  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  const badgeBg = {
    ACTIVE: '#B4E4BE',
    EXPECTED: '#F1D88A',
    DEPARTED: '#F3C9C9',
  };

  const filtered = items
    .filter(i => filter === 'ALL' || i.status === filter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const showBadge = filter === 'ALL'; // panelist revision: hide badge in filtered tabs

  const scrollDates = (dir) => {
    const el = document.getElementById('sched-day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

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
          <h1 className="text-4xl font-extrabold mb-5">Today's Schedule</h1>
          <div className="flex gap-2">
            {[
              { label: 'TOTAL', val: counts.TOTAL },
              { label: 'ACTIVE', val: counts.ACTIVE },
              { label: 'EXPECTED', val: counts.EXPECTED },
              { label: 'DEPARTED', val: counts.DEPARTED },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-black/15 rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold">{s.val}</p>
                <p className="text-[10px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Day calendar — scrollable full month */}
        <div className="bg-white rounded-3xl p-4 shadow mt-5">
          <div className="flex items-center gap-2">
            <button onClick={() => scrollDates(-1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div id="sched-day-scroll" className="flex gap-2 overflow-x-auto flex-1"
                 style={{ scrollbarWidth: 'none' }}>
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

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow mt-4">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-bold shadow shrink-0 ${filter === f ? 'text-white' : 'bg-white text-ink'}`}
                    style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-3xl p-4 shadow mt-4 max-h-[45vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-ink/60 font-semibold">
                {filter === 'ALL' ? 'No visitors scheduled yet' : `No ${filter.toLowerCase()} visitors`}
              </p>
              <p className="text-ink/40 text-sm mt-1">
                {filter === 'ALL' ? 'Pre-register a visitor to see them here.' : 'Try another filter or pre-register a visitor.'}
              </p>
            </div>
          ) : (
            <>
              {filtered.map((it, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
                    {it.start}
                    {it.end && <><br />to<br />{it.end}</>}
                  </div>
                  <div className="flex-1 border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-ink">{it.name}</p>
                      <p className="text-sm text-ink/60">{it.type}</p>
                      <p className="text-sm text-ink/60">Purpose: {it.purpose}</p>
                    </div>
                    {showBadge && (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: badgeBg[it.status], color: '#333' }}>
                        {it.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
            </>
          )}
        </div>
      </div>

      <BottomNav active="schedule" />
    </div>
  );
}
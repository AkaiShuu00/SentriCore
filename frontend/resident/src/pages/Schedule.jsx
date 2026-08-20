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
  const [weekOffset, setWeekOffset] = useState(0);

  // Sample data (ikokonekta sa backend after)
  const items = [
    { start: '2:00 PM', end: '-----', name: 'Joshua Mina', type: 'Visitor', purpose: 'Visiting a friend', status: 'ACTIVE' },
    { start: '-----', end: '', name: 'Juan Dela Cruz', type: 'Visitor', purpose: 'Visiting a friend', status: 'EXPECTED' },
    { start: '-----', end: '', name: 'Adrianne Pawhay', type: 'Visitor', purpose: 'N/A', status: 'EXPECTED' },
    { start: '-----', end: '', name: 'Naveah Lim', type: 'Visitor', purpose: 'Casual visit', status: 'EXPECTED' },
    { start: '6:00 PM', end: '6:30 PM', name: 'Delivery Rider', type: 'Delivery', purpose: 'Delivery', status: 'DEPARTED' },
    { start: '8:45 PM', end: '10:23 PM', name: 'Joeffrey Lannister', type: 'Visitor', purpose: 'N/A', status: 'DEPARTED' },
  ];

  const counts = {
    TOTAL: items.length,
    ACTIVE: items.filter(i => i.status === 'ACTIVE').length,
    EXPECTED: items.filter(i => i.status === 'EXPECTED').length,
    DEPARTED: items.filter(i => i.status === 'DEPARTED').length,
  };

  // Week days
  const week = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  for (let i = 0; i < 6; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    week.push(d);
  }

  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  const statusStyle = {
    ACTIVE: 'bg-green-200 text-green-800',
    EXPECTED: 'text-yellow-800',
    DEPARTED: 'text-red-800',
  };
  const badgeBg = {
    ACTIVE: '#B4E4BE',
    EXPECTED: '#F1D88A',
    DEPARTED: '#F3C9C9',
  };

  const filtered = items
    .filter(i => filter === 'ALL' || i.status === filter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const showBadge = filter === 'ALL'; // panelist revision: hide badge in filtered tabs

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

        {/* Day calendar */}
        <div className="bg-white rounded-3xl p-4 shadow mt-5">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(weekOffset - 1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div className="flex gap-2 overflow-x-auto flex-1">
              {week.map((d) => {
                const isActive = d.getDate() === selectedDay;
                return (
                  <button key={d.toISOString()} onClick={() => setSelectedDay(d.getDate())}
                          className={`flex flex-col items-center rounded-2xl px-3 py-2 min-w-[60px] shadow ${isActive ? 'text-white' : 'bg-white text-ink border border-gray-100'}`}
                          style={isActive ? { backgroundColor: '#0F6E6E' } : {}}>
                    <span className="text-xs font-semibold">{DAYS[d.getDay()]}</span>
                    <span className="text-2xl font-extrabold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setWeekOffset(weekOffset + 1)}
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
            <p className="text-center text-ink/50 py-6">No visitors found.</p>
          ) : (
            filtered.map((it, i) => (
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
            ))
          )}
          <p className="text-center text-ink/50 text-sm py-2">--- Nothing Follows ---</p>
        </div>
      </div>

      <BottomNav active="schedule" />
    </div>
  );
}
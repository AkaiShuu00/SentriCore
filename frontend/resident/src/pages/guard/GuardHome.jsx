import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import GuardBottomNav from '../../components/GuardBottomNav'; // gawin natin ang guard bottom nav

export default function GuardHome() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // ── Announcements (sample muna — iko-connect sa backend after) ──
  const announcements = [
    { icon: '🔥', bg: 'bg-white', text: 'Fire incident happening at Gemini Street' },
    { icon: '⚠️', bg: 'bg-white', text: 'Gate 1 temporarily closed' },
    { icon: '💧', bg: 'bg-yellow-100', text: 'Water interruption at 11:00 PM today, June 2, 2026' },
    { icon: '🧑', bg: 'bg-red-100', text: 'Homeowners meeting today at clubhouse, 10:30 AM' },
  ];

  // ── Community entries: shared sa buong community (galing localStorage muna) ──
  const registered = JSON.parse(localStorage.getItem('sentricore_expected') || '[]');
  const entries = registered.map((r) => ({
    start: '2:00 PM',
    end: '-----',
    name: r.name,
    type: r.regType === 'Delivery' ? 'Delivery' : 'Visitor',
    purpose: r.purpose || (r.regType === 'Delivery' ? 'Delivery' : 'N/A'),
    status: 'ACTIVE',
  }));

  // ── Stat counts ──
  const activeCount = entries.length;      // active entries sa community
  const expectedCount = entries.length;    // expected today
  const totalCount = entries.length;       // total

  // Build ALL days of the current month with correct day labels
  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    monthDays.push({ dayNum: i, dayLabel: DAY_LABELS[dateObj.getDay()] });
  }

  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const scrollDates = (dir) => {
    const el = document.getElementById('guard-day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="px-5">
        {/* Shift banner */}
        <div className="bg-white rounded-full shadow px-5 py-4 mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕐</span>
            <span className="text-ink">Shift ends in <span className="font-extrabold">4h 18m</span></span>
          </div>
          <button
            onClick={() => alert('End shift — iko-connect sa backend')}
            className="text-white text-xs font-bold px-4 py-2 rounded-full"
            style={{ backgroundColor: '#8FA99B' }}
          >
            END SHIFT
          </button>
        </div>

        {/* Announcements */}
        <h2 className="text-xl font-extrabold text-ink mt-6 mb-3">ANNOUNCEMENTS</h2>
        <div className="rounded-3xl p-5 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          {announcements.map((a, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 py-3">
                <div className={`w-11 h-11 rounded-full ${a.bg} flex items-center justify-center text-xl shrink-0`}>
                  {a.icon}
                </div>
                <p className="font-semibold text-sm">{a.text}</p>
              </div>
              {i < announcements.length - 1 && <div className="border-b border-white/20" />}
            </div>
          ))}
          <p className="text-center font-semibold mt-3">--- More ---</p>
        </div>

        {/* Quick Actions */}
        <h3 className="text-xl font-extrabold text-ink mt-8 mb-3">QUICK ACTIONS</h3>
        <div className="bg-white rounded-3xl p-5 shadow">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: '🔓', label: 'Verify Entry', bg: 'bg-teal-100', action: () => alert('Verify Entry') },
              { icon: '📅', label: 'Schedule', bg: 'bg-blue-100', action: () => navigate('/guard-schedule') },
              { icon: '📞', label: 'Contact Resident', bg: 'bg-purple-100', action: () => alert('Contact Resident') },
              { icon: '📤', label: 'Verify Exit', bg: 'bg-red-100', action: () => alert('Verify Exit') },
            ].map((q) => (
              <button key={q.label} onClick={q.action} className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl ${q.bg} flex items-center justify-center text-2xl mb-1`}>
                  {q.icon}
                </div>
                <span className="text-xs font-medium text-ink leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-teal-100 rounded-3xl p-4 shadow">
            <p className="text-sm text-ink">Active Entries</p>
            <p className="text-4xl font-extrabold text-ink my-2">{activeCount}</p>
            <div className="w-11 h-11 rounded-2xl bg-ink flex items-center justify-center text-white text-lg">👥</div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F1D88A' }}>
            <p className="text-sm text-ink">Expected Today</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a6d12' }}>{expectedCount}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#B8901F' }}>📅</div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F3C9C9' }}>
            <p className="text-sm text-ink">Total</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a2b2b' }}>{totalCount}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#A83232' }}>📄</div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="flex items-center justify-between mt-8 mb-1">
          <h3 className="text-xl font-extrabold text-ink">TODAY'S SCHEDULE</h3>
          <button onClick={() => navigate('/guard-schedule')} className="text-white text-xs font-bold px-4 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
            VIEW ALL
          </button>
        </div>
        <p className="text-lg font-semibold text-ink mb-3">{monthYear}</p>

        {/* Day calendar */}
        <div className="flex items-center gap-2">
          <button onClick={() => scrollDates(-1)} className="text-ink/40 text-2xl shrink-0">‹</button>
          <div id="guard-day-scroll" className="flex gap-2 overflow-x-auto flex-1 pb-1"
               style={{ scrollbarWidth: 'none' }}>
            {monthDays.map((d) => {
              const isActive = d.dayNum === selectedDay;
              return (
                <button key={d.dayNum} onClick={() => setSelectedDay(d.dayNum)}
                        className={`flex flex-col items-center rounded-2xl px-4 py-3 min-w-[64px] shadow shrink-0 ${isActive ? 'text-white' : 'bg-white text-ink'}`}
                        style={isActive ? { backgroundColor: '#0F6E6E' } : {}}>
                  <span className="text-xs font-semibold">{d.dayLabel}</span>
                  <span className="text-2xl font-extrabold">{d.dayNum}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollDates(1)} className="text-ink/40 text-2xl shrink-0">›</button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow mt-4">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* Active entries in the community */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4 mb-4">
          <h3 className="text-lg font-extrabold text-ink mb-4">ACTIVE ENTRIES IN THE COMMUNITY</h3>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-ink/60 font-semibold">No active entries</p>
              <p className="text-ink/40 text-sm mt-1">Entries in the community will appear here.</p>
            </div>
          ) : (
            filteredEntries.map((e, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
                <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
                  {e.start}<br />to<br />{e.end}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-ink">{e.name}</p>
                  <p className="text-sm text-ink/60">{e.type}</p>
                  <p className="text-sm text-ink/60">Purpose: {e.purpose}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom nav (guard) — center = Verify/Scan */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex items-center justify-around py-2 pb-4 z-40">
        <button onClick={() => navigate('/guard-home')} className="flex flex-col items-center px-3">
          <span className="text-2xl" style={{ color: '#0F6E6E' }}>🏠</span>
          <span className="text-[10px] font-semibold" style={{ color: '#0F6E6E' }}>Home</span>
        </button>
        <button onClick={() => navigate('/guard-schedule')} className="flex flex-col items-center px-3">
          <span className="text-2xl text-gray-400">📅</span>
        </button>
        <button onClick={() => alert('Verify / Scan')} className="w-14 h-14 rounded-full bg-ink text-white text-2xl flex items-center justify-center shadow-lg -mt-4">
          🔓
        </button>
        <button onClick={() => alert('Logs')} className="flex flex-col items-center px-3">
          <span className="text-2xl text-gray-400">📋</span>
        </button>
        <button onClick={() => navigate('/guard-profile')} className="flex flex-col items-center px-3">
          <span className="text-2xl text-gray-400">👤</span>
        </button>
      </nav>
    </div>
  );
}
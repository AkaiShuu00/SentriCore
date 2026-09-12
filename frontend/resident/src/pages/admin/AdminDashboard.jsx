import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { getAdminSummary, getAnnouncements } from '../../api';

// ── Sample data (iko-connect sa DB after) ──
// Stat card styling (value + sub galing DB)
const STAT_META = [
  { key: 'activeVisitors', label: 'Active Visitors', sub: 'Inside Subdivision', icon: '📍',
    gradient: 'linear-gradient(135deg,#E0A83E 0%,#C98A28 100%)', dark: false },
  { key: 'todayEntries', label: "Today's Entries", sub: 'Entries logged today', icon: '⤵',
    gradient: 'linear-gradient(135deg,#1E7E7E 0%,#0F5E5E 100%)', dark: true },
  { key: 'expectedToday', label: 'Expected Today', sub: 'Registered Visitors', icon: '📅',
    gradient: 'linear-gradient(135deg,#3FA89A 0%,#2E8C7E 100%)', dark: true },
  { key: 'activeGates', label: 'Active Gates', sub: 'Gates Currently Monitoring', icon: '🛡️',
    gradient: 'linear-gradient(135deg,#E0A83E 0%,#C98A28 100%)', dark: false },
];

const annIcon = (text) => {
  const t = (text || '').toLowerCase();
  if (t.includes('fire')) return { icon: '🔥', bg: '#F6E7C9' };
  if (t.includes('water')) return { icon: '💧', bg: '#CDEBE3' };
  if (t.includes('power')) return { icon: '⚡', bg: '#F6E7C9' };
  if (t.includes('gate') || t.includes('maintenance')) return { icon: '🛠️', bg: '#CDEBE3' };
  if (t.includes('meeting') || t.includes('homeowner')) return { icon: '🧑', bg: '#F3D9D9' };
  return { icon: '📢', bg: '#E8F1EE' };
};

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [selected, setSelected] = useState(new Date(today));
  const [showFullCal, setShowFullCal] = useState(false);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // ── DB data ──
  const [stats, setStats] = useState({ activeVisitors: 0, todayEntries: 0, expectedToday: 0, activeGates: 0, total: 0 });
  const [recent, setRecent] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    getAdminSummary()
      .then((res) => { setStats(res.data.stats || {}); setRecent(res.data.recent || []); })
      .catch(() => {});
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => {});
  }, []);

  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  // ── WEEK STRIP: ang linggo kung nasaan ang `selected` ──
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - selected.getDay()); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const headerLabel = selected.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const weekdayLabel = selected.toLocaleDateString('en-US', { weekday: 'long' });

  // ── FULL MONTH grid ──
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: prevMonthDays - firstDow + 1 + i, other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDow + daysInMonth) + 1, other: true });

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const openFullCal = () => {
    setViewMonth(selected.getMonth());
    setViewYear(selected.getFullYear());
    setShowFullCal(true);
  };
  const changeMonth = (dir) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  return (
    <AdminLayout>
      <div className="flex gap-6">
        {/* LEFT column */}
        <div className="flex-1 min-w-0">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-5">
            {STAT_META.map((s) => (
              <div key={s.key} className="rounded-3xl p-5 shadow-md relative overflow-hidden"
                   style={{ background: s.gradient, minHeight: 130 }}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0
                                  ${s.dark ? 'bg-white/20 text-white' : 'bg-white text-ink'}`}>
                    {s.icon}
                  </div>
                  <span className="ml-auto text-[11px] font-bold px-3 py-1 rounded-lg bg-ink/80 text-white">{s.label}</span>
                </div>
                <p className="text-5xl font-extrabold text-white mt-3 leading-none">{stats[s.key] ?? 0}</p>
                <p className="text-[11px] font-semibold text-white/80 mt-2">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-3xl p-6 shadow-sm mt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-ink">Recent Activity</h3>
              <button className="text-xs font-bold text-teal-700">View All ›</button>
            </div>
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-center text-ink/50 py-6 text-sm">No recent activity yet.</p>
              ) : recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {r.name} {r.status === 'Active' ? 'entered' : 'exited'} · {r.unit || ''}
                    </p>
                    <p className="text-[11px] text-ink/50">Guard: {r.guard}</p>
                  </div>
                  <span className="text-[11px] text-ink/40 shrink-0">
                    {fmtTime(r.status === 'Active' ? r.entry : (r.exit || r.entry))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="w-96 shrink-0">
          {/* Calendar (week strip) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xl font-extrabold text-ink">
                {headerLabel} <span className="text-sm font-semibold text-ink/50 ml-1">{weekdayLabel}</span>
              </p>
              <button onClick={openFullCal} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink text-lg">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((d) => (
                <span key={d.toISOString()} className="text-[11px] font-bold text-ink/50 py-1">{DAY_SHORT[d.getDay()]}</span>
              ))}
              {weekDays.map((d) => {
                const active = isSameDay(d, selected);
                return (
                  <button key={'d' + d.toISOString()} onClick={() => setSelected(new Date(d))}
                          className={`aspect-square rounded-full text-sm font-bold flex items-center justify-center
                            ${active ? 'bg-teal-600 text-white' : 'text-ink hover:bg-cream'}`}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Announcement panel */}
          <div className="bg-white rounded-3xl p-5 shadow-sm mt-5">
            <h3 className="text-lg font-extrabold text-ink mb-4">Announcement</h3>

            {/* Dark compose bar + View All */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => navigate('/admin-announcements')}
                      className="flex-1 flex items-center gap-2 bg-ink text-white rounded-xl px-4 py-3 text-sm font-semibold">
                <span>💬</span> Share an important community update?
              </button>
              <button onClick={() => navigate('/admin-announcements')}
                      className="bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold text-ink flex items-center gap-1">
                ▦ View All
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-center text-ink/50 py-4 text-sm">No announcements yet.</p>
              ) : announcements.slice(0, 3).map((a) => {
                const ic = annIcon(a.title + ' ' + (a.content || ''));
                return (
                  <div key={a.announcement_id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-3 py-3 shadow-sm">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: ic.bg }}>{ic.icon}</div>
                    <p className="flex-1 text-sm text-ink/80 leading-snug">{a.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FULL MONTH calendar modal */}
      {showFullCal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowFullCal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-2xl font-extrabold text-ink">{monthName}</p>
              <div className="flex gap-2">
                <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-full hover:bg-cream flex items-center justify-center text-ink text-lg">‹</button>
                <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-full hover:bg-cream flex items-center justify-center text-ink text-lg">›</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAY_LETTERS.map((d, i) => <span key={i} className="text-xs font-bold text-ink/50 py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((c, i) => {
                const cellDate = !c.other ? new Date(viewYear, viewMonth, c.day) : null;
                const active = cellDate && isSameDay(cellDate, selected);
                return (
                  <button key={i} disabled={c.other}
                          onClick={() => cellDate && setSelected(cellDate)}
                          className={`aspect-square rounded-full text-sm font-semibold flex items-center justify-center
                            ${c.other ? 'text-ink/25' : active ? 'bg-teal-600 text-white' : 'text-ink hover:bg-cream'}`}>
                    {c.day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-8">
              <button onClick={() => setShowFullCal(false)}
                      className="px-8 py-2.5 rounded-full border border-gray-300 font-bold text-ink text-sm bg-white shadow-sm">
                BACK
              </button>
              <button onClick={() => setShowFullCal(false)}
                      className="px-8 py-2.5 rounded-full font-bold text-ink text-sm shadow-sm"
                      style={{ backgroundColor: '#A9E5B0' }}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
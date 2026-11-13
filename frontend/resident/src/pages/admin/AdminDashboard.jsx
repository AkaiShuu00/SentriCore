import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { getAdminSummary, getAnnouncements, adminListComplaints, adminAuditReport, adminGuardReports } from '../../api';
import {
  MapPin, LogIn, CalendarDays, Flame, Droplet, Zap, Wrench, Users, Megaphone, MessageSquare, AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Stat card styling (value + sub galing DB)
// #4 — "Registered Visitors" (expectedToday) ay PAREHAS na ng gradient sa "Today's Entries".
const ENTRIES_GRADIENT = 'linear-gradient(135deg,#1E7E7E 0%,#0F5E5E 100%)';
const STAT_META = [
  { key: 'activeVisitors', label: 'Active Visitors', sub: 'Inside Subdivision', Icon: MapPin,
    gradient: 'linear-gradient(135deg,#E0A83E 0%,#C98A28 100%)', dark: false },
  { key: 'todayEntries', label: "Today's Entries", sub: 'Entries logged today', Icon: LogIn,
    gradient: ENTRIES_GRADIENT, dark: true },
  { key: 'expectedToday', label: 'Expected Today', sub: 'Registered Visitors', Icon: CalendarDays,
    gradient: ENTRIES_GRADIENT, dark: true },
  { key: 'weeklyVisitors', label: 'Visitors This Week', sub: 'Mon–Sun', Icon: Users,
    gradient: 'linear-gradient(135deg,#E0A83E 0%,#C98A28 100%)', dark: false },
];

const annIcon = (text) => {
  const t = (text || '').toLowerCase();
  if (t.includes('fire')) return { Icon: Flame, bg: '#F6E7C9' };
  if (t.includes('water')) return { Icon: Droplet, bg: '#CDEBE3' };
  if (t.includes('power')) return { Icon: Zap, bg: '#F6E7C9' };
  if (t.includes('gate') || t.includes('maintenance')) return { Icon: Wrench, bg: '#CDEBE3' };
  if (t.includes('meeting') || t.includes('homeowner')) return { Icon: Users, bg: '#F3D9D9' };
  return { Icon: Megaphone, bg: '#E8F1EE' };
};

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [selected, setSelected] = useState(new Date(today));
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // ── DB data ──
  const [stats, setStats] = useState({ activeVisitors: 0, todayEntries: 0, expectedToday: 0, activeGates: 0, total: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [pendRes, setPendRes] = useState(0);     // resident Pending
  const [pendGuard, setPendGuard] = useState(0); // guard Open
  const pendingComplaints = pendRes + pendGuard;
  const [weeklyExpected, setWeeklyExpected] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]); // #3 — recent activity = audit (entries/exits/complaints/reports)

  useEffect(() => {
    getAdminSummary()
      .then((res) => { setStats(res.data.stats || {}); setWeeklyExpected(res.data.weeklyExpected || []); })
      .catch(() => {});
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => {});

    // #3 — Recent Activity konektado sa Audit Trails (entries/exits + complaints + reports)
    adminAuditReport()
      .then((res) => setRecentAudit(res.data?.list || []))
      .catch(() => setRecentAudit([]));

    // #2 — Complaint Reports card = resident Pending + guard Open (unacknowledged)
    Promise.all([
      adminListComplaints().then((res) => res.data?.list || []).catch(() => []),
      adminGuardReports().then((res) => res.data?.list || []).catch(() => []),
    ]).then(([comps, greps]) => {
      setPendRes(comps.filter((c) => (c.status || 'Pending') === 'Pending').length);
      setPendGuard(greps.filter((g) => (g.status || 'Open') === 'Open').length);
    }).catch(() => { setPendRes(0); setPendGuard(0); });
  }, []);

  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const roleColor = (r) => r === 'Guard' ? { bg: '#CFEDE4', fg: '#0F6E6E' }
    : r === 'Resident' ? { bg: '#D9C2E9', fg: '#5b2c86' }
    : r === 'Admin' ? { bg: '#F1D88A', fg: '#8a6d12' }
    : { bg: '#eee', fg: '#555' };

  // ── FULL MONTH grid (#5 — buong buwan na agad ang nakikita) ──
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: prevMonthDays - firstDow + 1 + i, other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDow + daysInMonth) + 1, other: true });

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
                                  ${s.dark ? 'bg-white/20 text-white' : 'bg-white text-ink'}`}>
                    <s.Icon size={22} />
                  </div>
                  <span className="ml-auto text-[11px] font-bold px-3 py-1 rounded-lg bg-ink/80 text-white">{s.label}</span>
                </div>
                <p className="text-5xl font-extrabold text-white mt-3 leading-none">{stats[s.key] ?? 0}</p>
                <p className="text-[11px] font-semibold text-white/80 mt-2">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Expected visitors this week (Mon–Sun) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-extrabold text-ink">Expected Visitors This Week</h3>
              <span className="text-xs text-ink/50">Mon–Sun</span>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={weeklyExpected} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="expected" name="Expected" fill="#1E7E7E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-3xl p-6 shadow-sm mt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-ink">Recent Activity</h3>
              {/* #1 — View All → Audit Trails */}
              <button onClick={() => navigate('/admin-reports?view=audit')}
                      className="text-xs font-bold text-teal-700">View All ›</button>
            </div>
            <div className="space-y-2">
              {recentAudit.length === 0 ? (
                <p className="text-center text-ink/50 py-6 text-sm">No recent activity yet.</p>
              ) : recentAudit.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-ink">
                      {r.action}
                    </p>
                    <p className="text-[11px] text-ink/60 truncate">{r.details}</p>
                    <p className="text-[11px] mt-1 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: roleColor(r.role).bg, color: roleColor(r.role).fg }}>
                        {r.role}
                      </span>
                      <span className="text-ink/60 font-semibold">{r.actor}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-ink/40 shrink-0">
                    {fmtTime(r.ts)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="w-96 shrink-0">
          {/* #5 — FULL MONTH calendar (inline) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xl font-extrabold text-ink">{monthName}</p>
              <div className="flex gap-2">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink text-lg">‹</button>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink text-lg">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_LETTERS.map((d, i) => <span key={i} className="text-[11px] font-bold text-ink/50 py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((c, i) => {
                const cellDate = !c.other ? new Date(viewYear, viewMonth, c.day) : null;
                const active = cellDate && isSameDay(cellDate, selected);
                const isToday = cellDate && isSameDay(cellDate, today);
                return (
                  <button key={i} disabled={c.other}
                          onClick={() => cellDate && setSelected(cellDate)}
                          className={`aspect-square rounded-full text-sm font-semibold flex items-center justify-center
                            ${c.other ? 'text-ink/20' : active ? 'text-white' : isToday ? 'text-white' : 'text-ink hover:bg-cream'}`}
                          style={active ? { backgroundColor: '#0E2A2E' } : isToday ? { backgroundColor: '#3FA89A' } : {}}>
                    {c.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Announcement panel */}
          <div className="bg-white rounded-3xl p-5 shadow-sm mt-5">
            <h3 className="text-lg font-extrabold text-ink mb-4">Announcement</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => navigate('/admin-announcements')}
                      className="flex-1 flex items-center gap-2 bg-ink text-white rounded-xl px-4 py-3 text-sm font-semibold">
                <MessageSquare size={18} className="inline" /> Share an important community update?
              </button>
              <button onClick={() => navigate('/admin-announcements')}
                      className="bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold text-ink flex items-center gap-1">
                ▦ View All
              </button>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-center text-ink/50 py-4 text-sm">No announcements yet.</p>
              ) : announcements.slice(0, 3).map((a) => {
                const ic = annIcon(a.title + ' ' + (a.content || ''));
                return (
                  <div key={a.announcement_id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-3 py-3 shadow-sm">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: ic.bg }}><ic.Icon size={18} className="text-ink" /></div>
                    <p className="flex-1 text-sm text-ink/80 leading-snug">{a.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complaint Reports */}
          <button onClick={() => navigate('/admin-reports?view=complaints')}
                  className="w-full mt-5 bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4 text-left active:scale-[0.99] transition">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F3C9C9' }}>
                <AlertTriangle size={22} style={{ color: '#9b2c2c' }} />
              </div>
              {pendRes > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                  {pendRes > 9 ? '9+' : pendRes}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-ink">Complaint Reports</p>
              <p className="text-xs text-ink/60">
                {pendRes === 0
                  ? 'No complaints reported'
                  : `${pendRes} new complaint${pendRes > 1 ? 's' : ''} reported by resident`}
              </p>
            </div>
            <span className="text-ink/40 shrink-0">›</span>
          </button>

          {/* Incident Report — guard-filed reports; click → Incident Monitoring sa Reports tab */}
          <button onClick={() => navigate('/admin-reports?view=incident')}
                  className="w-full mt-4 bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4 text-left active:scale-[0.99] transition">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#D9C2E9' }}>
                <ShieldAlert size={22} style={{ color: '#5b2c86' }} />
              </div>
              {pendGuard > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                  {pendGuard > 9 ? '9+' : pendGuard}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-ink">Incident Report</p>
              <p className="text-xs text-ink/60">
                {pendGuard === 0
                  ? 'No incident reports filed'
                  : `${pendGuard} new incident report${pendGuard > 1 ? 's' : ''} filed by guard`}
              </p>
            </div>
            <span className="text-ink/40 shrink-0">›</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
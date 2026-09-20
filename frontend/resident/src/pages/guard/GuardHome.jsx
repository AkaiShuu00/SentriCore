import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import AnnouncementsModal from '../../components/AnnouncementsModal';
import { getAnnouncements, getActiveVisitors, getSchedule } from '../../api';
import {
  Flame, Droplet, Zap, ShieldAlert, Users, Wrench, Megaphone, Shield, Clock,
  ScanLine, CalendarDays, Phone, LogOut, FileText, Search, Inbox,
} from 'lucide-react';

const AnnIcon = ({ a, ...p }) => {
  const t = `${a.category || ''} ${a.title || ''}`.toLowerCase();
  if (t.includes('fire')) return <Flame {...p} />;
  if (t.includes('water')) return <Droplet {...p} />;
  if (t.includes('power') || t.includes('electric')) return <Zap {...p} />;
  if (t.includes('gate') || t.includes('security')) return <ShieldAlert {...p} />;
  if (t.includes('meeting') || t.includes('event') || t.includes('election')) return <Users {...p} />;
  if (t.includes('maintenance')) return <Wrench {...p} />;
  return <Megaphone {...p} />;
};

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-----';

// Kunin ang unang value mula sa listahan ng posibleng field names (robust sa iba't ibang schema).
const pick = (obj, keys) => {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  return null;
};

// I-normalize ang kahit anong petsa/timestamp patungo sa LOCAL na YYYY-MM-DD.
const toLocalISO = (val) => {
  if (!val) return null;
  const s = String(val);
  // PURE date-only string (walang oras/timezone) → gamitin as-is (iwas shift).
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) return dateOnly[1];
  // May oras/Z (hal. 2026-09-20T16:00:00.000Z) → i-convert sa LOCAL na petsa.
  const d = new Date(s);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function GuardHome() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  // ── Announcements (mula DB — naka-filter na para sa Guards + active window) ──
  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
  }, []);

  // ── Live data mula DB: active visitors + today's schedule ──
  const [activeList, setActiveList] = useState([]);
  const [schedule, setSchedule] = useState([]);
  useEffect(() => {
    getActiveVisitors()
      .then((res) => setActiveList((res.data || []).map((t) => ({
        name: t.visitor_name,
        type: t.visitor_type || 'Visitor',
        purpose: t.purpose || 'N/A',
        start: fmtTime(t.entry_time),
      }))))
      .catch(() => setActiveList([]));
    getSchedule().then((res) => setSchedule(res.data || [])).catch(() => setSchedule([]));
  }, []);

  const year = today.getFullYear();
  const month = today.getMonth();
  const todayISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ── Stat counts (para sa ARAW na ito) ── robust sa field names + date format
  const activeCount = activeList.length;   // kasalukuyang nasa loob
  let expectedToday = 0, departedToday = 0;
  schedule.forEach((reg) => {
    // petsa ng expected — subukan lahat ng posibleng field name
    const regDate = toLocalISO(pick(reg, ['expectedDate', 'expected_date', 'expected_time', 'visit_date', 'date']));
    // ang mga bisita ay maaaring nasa reg.visitors, o ang reg mismo ay isang row na
    const visitors = Array.isArray(reg.visitors) && reg.visitors.length ? reg.visitors : [reg];
    visitors.forEach((v) => {
      const status = String(pick(v, ['status', 'entry_status', 'entryStatus']) || '').toUpperCase();
      const vDate = toLocalISO(pick(v, ['expectedDate', 'expected_date', 'expected_time', 'visit_date'])) || regDate;
      const out = pick(v, ['timeOut', 'exit_time', 'time_out']);
      const entered = pick(v, ['timeIn', 'entry_time', 'time_in']);
      // Malinaw na status
      if (status === 'EXPECTED' && vDate === todayISO) { expectedToday++; return; }
      if (status === 'DEPARTED' && toLocalISO(out) === todayISO) { departedToday++; return; }
      // Fallback kung walang status field: expected today = may petsa today, wala pang pasok/labas
      if (!status && vDate === todayISO && !entered && !out) expectedToday++;
    });
  });
  const totalToday = activeCount + expectedToday + departedToday;

  // Build ALL days of the current month with correct day labels
  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
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

  const filteredEntries = activeList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center justify-between">
        <img src="/logo.jpg" alt="SentriCore" className="w-12 h-12 object-contain rounded-full bg-white/10" />
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
          <span className="font-bold text-ink">{user.name || 'Guard One'}</span>
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center"><Shield size={20} className="text-ink" /></div>
        </div>
      </header>

      <div className="px-5">
        {/* Shift banner */}
        <div className="bg-white rounded-full shadow px-5 py-4 mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={22} className="text-ink" />
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
        <button onClick={() => setShowAnnouncements(true)}
             className="w-full text-left rounded-3xl p-5 shadow-lg text-white active:scale-[0.99] transition"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          {announcements.length === 0 ? (
            <p className="text-center font-semibold text-sm py-4 text-white/80">No announcements for you right now.</p>
          ) : announcements.slice(0, 4).map((a, i) => (
            <div key={a.announcement_id || i}>
              <div className="flex items-center gap-4 py-3">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
                  <AnnIcon a={a} size={20} className="text-teal-700" />
                </div>
                <p className="font-semibold text-sm truncate">{a.title}</p>
              </div>
              {i < Math.min(announcements.length, 4) - 1 && <div className="border-b border-white/20" />}
            </div>
          ))}
          {announcements.length > 0 && <p className="text-center font-semibold mt-3">--- More ---</p>}
        </button>

        {/* Quick Actions */}
        <h3 className="text-xl font-extrabold text-ink mt-8 mb-3">QUICK ACTIONS</h3>
        <div className="bg-white rounded-3xl p-5 shadow">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { Icon: ScanLine, label: 'Verify Entry', bg: 'bg-teal-100', action: () => navigate('/guard-verify') },
              { Icon: CalendarDays, label: 'Schedule', bg: 'bg-blue-100', action: () => navigate('/guard-schedule') },
              { Icon: Phone, label: 'Contact Resident', bg: 'bg-purple-100', action: () => alert('Contact Resident') },
              { Icon: LogOut, label: 'Verify Exit', bg: 'bg-red-100', action: () => navigate('/guard-verify?mode=exit') },
            ].map((q) => (
              <button key={q.label} onClick={q.action} className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl ${q.bg} flex items-center justify-center mb-1`}>
                  <q.Icon size={24} className="text-ink" />
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
            <div className="w-11 h-11 rounded-2xl bg-ink flex items-center justify-center text-white"><Users size={20} /></div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F1D88A' }}>
            <p className="text-sm text-ink">Expected Today</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a6d12' }}>{expectedToday}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#B8901F' }}><CalendarDays size={20} /></div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F3C9C9' }}>
            <p className="text-sm text-ink">Total Today</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a2b2b' }}>{totalToday}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#A83232' }}><FileText size={20} /></div>
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
          <Search size={18} className="text-ink/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* Active entries in the community */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4 mb-4">
          <h3 className="text-lg font-extrabold text-ink mb-4">ACTIVE ENTRIES IN THE COMMUNITY</h3>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-2"><Inbox size={36} className="text-ink/40" /></div>
              <p className="text-ink/60 font-semibold">No active entries</p>
              <p className="text-ink/40 text-sm mt-1">Entries in the community will appear here.</p>
            </div>
          ) : (
            filteredEntries.map((e, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
                <div className="text-xs font-bold text-ink text-center w-16 shrink-0 leading-tight">
                  {e.start}
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

      {/* Bottom nav (guard) */}
      <GuardBottomNav active="home" />

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}
    </div>
  );
}
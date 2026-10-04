import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import AnnouncementsModal from '../../components/AnnouncementsModal';
import { getAnnouncements, getActiveVisitors, getSchedule, getMyShift, getResidentsForGuard, getMyGuardProfile } from '../../api';
import {
  Flame, Droplet, Zap, ShieldAlert, Users, Wrench, Megaphone, Shield, Clock,
  CalendarDays, FileText, Search, Inbox, Phone, X,
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

// Assigned shift 'HH:MM:SS' → "6:00 AM"
const fmt12 = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = (h % 12) || 12;
  return `${hh}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

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
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [shift, setShift] = useState({ shiftStart: null, shiftEnd: null, timeIn: null });
  const [nowTick, setNowTick] = useState(Date.now());
  const [showContact, setShowContact] = useState(false);
  const [residents, setResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState('');

  const openContact = () => {
    setResidentSearch('');
    setShowContact(true);
    getResidentsForGuard()
      .then((res) => setResidents((res.data || []).map((r) => ({
        residentId: r.resident_id, name: r.full_name,
        address: r.unit_address, contact: r.contact_number || r.phone_number || '',
      }))))
      .catch(() => setResidents([]));
  };
  const callResident = (r) => {
    const num = String(r.contact || '').replace(/[^\d+]/g, '');
    if (!num) { alert('This resident has no contact number.'); return; }
    window.location.href = `tel:${num}`;
  };

  // ── Announcements (mula DB — naka-filter na para sa Guards + active window) ──
  const [announcements, setAnnouncements] = useState([]);
  const [guardPhoto, setGuardPhoto] = useState(null);
  useEffect(() => {
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
    getMyShift().then((res) => setShift(res.data || {})).catch(() => {});
    getMyGuardProfile().then((res) => setGuardPhoto(res.data?.photo || null)).catch(() => {});
  }, []);

  // Real-time: oras kada segundo (duty + countdown) + refetch shift kada 20s (sunod agad kay admin)
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    const s = setInterval(() => { getMyShift().then((res) => setShift(res.data || {})).catch(() => {}); }, 20000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  // I-scroll sa harapan ang petsa NGAYON sa day strip
  useEffect(() => {
    const el = document.getElementById('guard-today-cell');
    if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, []);

  // ── Duty = base LANG sa oras ngayon vs shift window (kaya ang cross-midnight, hal. 6PM–6AM) ──
  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const nowDate = new Date(nowTick);
  const curMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const hasShift = !!(shift.shiftStart && shift.shiftEnd);
  const sMin = toMin(shift.shiftStart), eMin = toMin(shift.shiftEnd);
  const onDuty = hasShift && (sMin === eMin ? false : (sMin < eMin ? (curMin >= sMin && curMin < eMin) : (curMin >= sMin || curMin < eMin)));
  const isShiftOver = hasShift && !onDuty;

  // Admin-assigned shift window (hal. "6:00 AM - 6:00 PM")
  const assignedShiftLabel = hasShift ? `${fmt12(shift.shiftStart)} - ${fmt12(shift.shiftEnd)}` : null;

  const shiftEndDate = (() => {
    if (!onDuty) return null;
    const [eh, em] = String(shift.shiftEnd).split(':').map(Number);
    const end = new Date(nowDate); end.setHours(eh || 0, em || 0, 0, 0);
    if (end <= nowDate) end.setDate(end.getDate() + 1);
    return end;
  })();
  const remainingLabel = (() => {
    if (!shiftEndDate) return '—';
    const diff = shiftEndDate.getTime() - nowTick;
    if (diff <= 0) return 'Shift is over';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  })();

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

  const filteredEntries = activeList;   // #7: inalis ang search bar

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center justify-between">
        <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center p-1">
          <img src="/logo.png" alt="SentriCore" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2">
          {/* Contact resident — phone icon lang, katabi (kaliwa) ng pangalan */}
          <button onClick={openContact} aria-label="Contact resident"
                  className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-95 transition">
            <Phone size={18} className="text-ink" />
          </button>
          {/* Profile chip — photo + name, makikita sa lahat ng tab, click → profile */}
          <button onClick={() => navigate('/guard-profile')}
                  className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
            <span className="font-bold text-ink">{user.name || 'Guard One'}</span>
            <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center overflow-hidden">
              {guardPhoto
                ? <img src={guardPhoto} alt={user.name || 'Guard'} className="w-full h-full object-cover" />
                : <Shield size={20} className="text-ink" />}
            </div>
          </button>
        </div>
      </header>

      <div className="px-5">
        {/* Shift banner */}
        <div className="bg-white rounded-3xl shadow px-5 py-4 mt-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Clock size={22} className="text-ink shrink-0" />
            <div className="min-w-0">
              <span className="block text-ink text-sm truncate">
                {onDuty
                  ? <><span className="font-extrabold">On duty</span> · ends in {remainingLabel}</>
                  : <span className="font-extrabold">Off duty</span>}
              </span>
              <span className="block text-[11px] text-ink/60 truncate">
                {assignedShiftLabel ? `Assigned: ${assignedShiftLabel}` : 'No shift assigned yet'}
              </span>
            </div>
          </div>
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
              const isToday = d.dayNum === today.getDate();
              const style = isActive ? { backgroundColor: '#0F6E6E' }
                : isToday ? { backgroundColor: '#F1D88A' } : {};
              return (
                <button key={d.dayNum} id={isToday ? 'guard-today-cell' : undefined}
                        onClick={() => setSelectedDay(d.dayNum)}
                        className={`flex flex-col items-center rounded-2xl px-4 py-3 min-w-[64px] shadow shrink-0 ${isActive ? 'text-white' : 'text-ink'} ${!isActive && !isToday ? 'bg-white' : ''}`}
                        style={style}>
                  <span className="text-xs font-semibold">{d.dayLabel}</span>
                  <span className="text-2xl font-extrabold">{d.dayNum}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollDates(1)} className="text-ink/40 text-2xl shrink-0">›</button>
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

      {/* Contact Resident modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5" onClick={() => setShowContact(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 relative max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h3 className="text-lg font-extrabold text-ink mb-1">Contact Resident</h3>
            <p className="text-ink/60 text-xs mb-3">Tap Call to reach a resident.</p>
            <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-3" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={16} className="text-ink/40" />
              <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)}
                     placeholder="Search resident name"
                     className="flex-1 outline-none text-sm bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="overflow-y-auto space-y-2">
              {residents.filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase())).length === 0 ? (
                <p className="text-center text-ink/50 py-6 text-sm">No residents found.</p>
              ) : residents
                  .filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase()))
                  .map((r) => (
                    <div key={r.residentId} className="border border-gray-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-sm truncate">{r.name}</p>
                        <p className="text-xs text-ink/60 truncate">{r.address}</p>
                        <p className="text-xs text-ink/60">{r.contact || '—'}</p>
                      </div>
                      <button onClick={() => callResident(r)}
                              className="text-white text-[11px] font-bold px-4 py-2 rounded-full inline-flex items-center gap-1 shrink-0"
                              style={{ backgroundColor: '#1a5fa8' }}>
                        <Phone size={14} /> Call
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
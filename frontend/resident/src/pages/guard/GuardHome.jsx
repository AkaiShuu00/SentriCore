import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import AnnouncementsModal from '../../components/AnnouncementsModal';
import { getAnnouncements, getActiveVisitors, getSchedule, getMyShift, endGuardShift, getResidentsForGuard } from '../../api';
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
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [shift, setShift] = useState({ shiftStart: null, shiftEnd: null, timeIn: null });
  const [showEnd, setShowEnd] = useState(false);
  const [ending, setEnding] = useState(false);
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
  useEffect(() => {
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
    getMyShift().then((res) => setShift(res.data || {})).catch(() => {});
  }, []);

  // Bawat minuto i-update ang "shift ends in" countdown
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // I-scroll sa harapan ang petsa NGAYON sa day strip
  useEffect(() => {
    const el = document.getElementById('guard-today-cell');
    if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, []);

  // ── Shift end computation (kaya ang cross-midnight, hal. 6PM–6AM) ──
  const parseHM = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return { h: h || 0, m: m || 0 }; };
  const shiftEndDate = (() => {
    if (!shift.shiftEnd) return null;
    const anchor = shift.timeIn ? new Date(shift.timeIn) : new Date();
    const { h, m } = parseHM(shift.shiftEnd);
    const end = new Date(anchor); end.setHours(h, m, 0, 0);
    if (end <= anchor) end.setDate(end.getDate() + 1); // tumawid ng hatinggabi
    return end;
  })();
  // Admin-assigned shift window (hal. "6:00 AM - 6:00 PM")
  const assignedShiftLabel = (shift.shiftStart && shift.shiftEnd)
    ? `${fmt12(shift.shiftStart)} - ${fmt12(shift.shiftEnd)}`
    : null;

  const nowMs = nowTick;
  const isShiftOver = shiftEndDate ? nowMs >= shiftEndDate.getTime() : false;
  const remainingLabel = (() => {
    if (!shiftEndDate) return '—';
    const diff = shiftEndDate.getTime() - nowMs;
    if (diff <= 0) return 'Shift is over';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  })();

  const doEndShift = async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endGuardShift();
    } catch { /* ituloy pa rin ang logout kahit pumalya ang tala */ }
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/signin');
  };

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
        <img src="/logo.png" alt="SentriCore" className="w-12 h-12 object-contain" />
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
          <span className="font-bold text-ink">{user.name || 'Guard One'}</span>
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center"><Shield size={20} className="text-ink" /></div>
        </div>
      </header>

      <div className="px-5">
        {/* Shift banner */}
        <div className="bg-white rounded-3xl shadow px-5 py-4 mt-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Clock size={22} className="text-ink shrink-0" />
            <div className="min-w-0">
              <span className="block text-ink text-sm truncate">
                {isShiftOver
                  ? <span className="font-extrabold">Shift is over</span>
                  : <><span className="font-extrabold">Shift is ongoing</span> · ends in {remainingLabel}</>}
              </span>
              <span className="block text-[11px] text-ink/60 truncate">
                {assignedShiftLabel ? `Assigned: ${assignedShiftLabel}` : 'No shift assigned yet'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openContact}
              className="text-white text-xs font-bold px-3 py-2 rounded-full inline-flex items-center gap-1"
              style={{ backgroundColor: '#1a5fa8' }}
            >
              <Phone size={14} /> Contact
            </button>
            <button
              onClick={() => setShowEnd(true)}
              className="text-white text-xs font-bold px-4 py-2 rounded-full"
              style={{ backgroundColor: isShiftOver ? '#0F6E6E' : '#8FA99B' }}
            >
              END SHIFT
            </button>
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

      {/* END SHIFT modal — iba ang mensahe kung tapos na o hindi pa ang shift */}
      {showEnd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: isShiftOver ? '#DCF3E4' : '#F1D88A' }}>
                <Clock size={28} style={{ color: isShiftOver ? '#1e6b2e' : '#8a6d12' }} />
              </div>
            </div>
            {isShiftOver ? (
              <>
                <h3 className="text-xl font-extrabold text-ink mb-2">Thank you for your work today!</h3>
                <p className="text-ink/60 text-sm mb-5">
                  Your shift is complete. Ending your shift will log your time-out and sign you out.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-extrabold text-ink mb-2">Your shift isn't over yet</h3>
                <p className="text-ink/60 text-sm mb-5">
                  {shiftEndDate
                    ? <>You still have <span className="font-bold">{remainingLabel}</span> left. Do you still want to leave and end your shift?</>
                    : 'Do you still want to leave and end your shift?'}
                </p>
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowEnd(false)} disabled={ending}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                {isShiftOver ? 'NOT YET' : 'STAY'}
              </button>
              <button onClick={doEndShift} disabled={ending}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-60"
                      style={{ backgroundColor: isShiftOver ? '#0F6E6E' : '#9b2c2c' }}>
                {ending ? 'ENDING…' : (isShiftOver ? 'END SHIFT' : 'LEAVE & END')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
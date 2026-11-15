import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import AnnouncementsModal from '../../components/AnnouncementsModal';
import GroupList from '../../components/GroupList';
import { getAnnouncements, getSchedule, getMyShift, getResidentsForGuard, getMyGuardProfile } from '../../api';
import { Flame, Droplet, Zap, ShieldAlert, Users, Wrench, Megaphone, Clock, Bell, Phone, Search, X, CalendarClock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DARK = '#0A4A4A';
const TEAL = '#0F6E6E';

const AnnIcon = ({ a, ...p }) => {
  const t = `${a.category || ''} ${a.title || ''}`.toLowerCase();
  if (t.includes('fire')) return <Flame {...p} />;
  if (t.includes('water')) return <Droplet {...p} />;
  if (t.includes('power') || t.includes('electric')) return <Zap {...p} />;
  if (t.includes('gate') || t.includes('security')) return <ShieldAlert {...p} />;
  if (t.includes('meeting') || t.includes('event')) return <Users {...p} />;
  if (t.includes('maintenance')) return <Wrench {...p} />;
  return <Megaphone {...p} />;
};
const fmt12 = (t) => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const hh = (h % 12) || 12; return `${hh}:${String(m || 0).padStart(2, '0')} ${ap}`; };
const toLocalISO = (val) => {
  if (!val) return '';
  const s = String(val); const m = s.match(/^(\d{4}-\d{2}-\d{2})$/); if (m) return m[1];
  const d = new Date(s); if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Guard schedule reg → GroupList shape
const STMAP = { ACTIVE: 'Active', EXPECTED: 'Expected', DEPARTED: 'Departed' };
const adaptReg = (r) => ({
  registration_id: r.registrationId, registration_type: r.registrationType || 'Single',
  batch_name: r.batchName || null, order_id: r.orderId || null, purpose: r.purpose || null,
  canManage: false,
  visitors: (r.visitors || []).map((v) => ({ name: v.name, status: STMAP[String(v.status).toUpperCase()] || v.status })),
});

export default function GuardHome() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [listTab, setListTab] = useState('EXPECTED');
  const [schedSearch, setSchedSearch] = useState('');
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [shift, setShift] = useState({ shiftStart: null, shiftEnd: null });
  const [nowTick, setNowTick] = useState(Date.now());

  // Contact Resident modal (galing quick action)
  const [showContact, setShowContact] = useState(false);
  const [residents, setResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [callResult, setCallResult] = useState(null); // tinawagang resident → CALL RESULT pop-up
  const openContact = () => {
    setResidentSearch(''); setShowContact(true);
    getResidentsForGuard().then((res) => setResidents((res.data || []).map((r) => ({
      residentId: r.resident_id, name: r.full_name, address: r.unit_address, contact: r.contact_number || r.phone_number || '',
    })))).catch(() => setResidents([]));
  };
  const callResident = (r) => {
    const num = String(r.contact || '').replace(/[^\d+]/g, '');
    if (num) window.location.href = `tel:${num}`;
    else alert('This resident has no contact number.');
    setShowContact(false);
    setCallResult(r);  // ipakita ang CALL RESULT pagkatapos tumawag
  };

  const [announcements, setAnnouncements] = useState([]);
  const [schedule, setSchedule] = useState([]);
  useEffect(() => {
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
    getMyShift().then((res) => setShift(res.data || {})).catch(() => {});
    getSchedule().then((res) => setSchedule(res.data || [])).catch(() => setSchedule([]));
    getMyGuardProfile().then(() => {}).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    const s = setInterval(() => getMyShift().then((res) => setShift(res.data || {})).catch(() => {}), 20000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);
  useEffect(() => { const el = document.getElementById('guard-today-cell'); if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' }); }, [schedule.length]);

  // Duty + countdown
  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const nowDate = new Date(nowTick);
  const curMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const hasShift = !!(shift.shiftStart && shift.shiftEnd);
  const sMin = toMin(shift.shiftStart), eMin = toMin(shift.shiftEnd);
  const onDuty = hasShift && (sMin === eMin ? false : (sMin < eMin ? (curMin >= sMin && curMin < eMin) : (curMin >= sMin || curMin < eMin)));
  const endLabel = fmt12(shift.shiftEnd);
  const shiftEndDate = (() => { if (!onDuty) return null; const [eh, em] = String(shift.shiftEnd).split(':').map(Number); const end = new Date(nowDate); end.setHours(eh || 0, em || 0, 0, 0); if (end <= nowDate) end.setDate(end.getDate() + 1); return end; })();
  const remaining = (() => { if (!shiftEndDate) return null; const diff = shiftEndDate.getTime() - nowTick; if (diff <= 0) return null; const hrs = Math.floor(diff / 3600000); const mins = Math.floor((diff % 3600000) / 60000); return `${hrs}h ${mins}m`; })();

  const year = today.getFullYear(), month = today.getMonth();
  const selectedISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  // Day strip
  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) monthDays.push({ dayNum: i, dayLabel: DAY_LABELS[new Date(year, month, i).getDay()] });
  const scrollDays = (dir) => { const el = document.getElementById('guard-day-scroll'); if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' }); };

  // Day regs (GroupList shape)
  const dayRegs = schedule.filter((r) => toLocalISO(r.expectedDate || r.expected_date) === selectedISO).map(adaptReg);
  const countBy = (st) => dayRegs.reduce((n, r) => n + r.visitors.filter((v) => v.status === st).length, 0);
  const expectedToday = countBy('Expected');
  const activeVisitors = countBy('Active');
  const totalToday = expectedToday + activeVisitors + countBy('Departed');

  // Weekly chart
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekKeys = DOW.map((label, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return { label, iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }; });
  const expectedByDay = {};
  schedule.forEach((r) => { const iso = toLocalISO(r.expectedDate || r.expected_date); const n = (r.visitors || []).length; if (iso) expectedByDay[iso] = (expectedByDay[iso] || 0) + n; });
  const weekChart = weekKeys.map((k) => ({ day: k.label, expected: expectedByDay[k.iso] || 0 }));

  const quickActions = [
    { Icon: Phone, label: 'Contact Resident', action: openContact },
    { Icon: ShieldAlert, label: 'File a Report', action: () => navigate('/guard-report') },
  ];

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header — resident style */}
      <header className="relative overflow-hidden px-5 pt-7 pb-14 rounded-b-[32px]"
              style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 500 70" preserveAspectRatio="none" style={{ height: '52px' }}>
          <path d="M0,35 C130,75 370,-5 500,35 L500,70 L0,70 Z" fill="rgba(255,255,255,0.07)" />
          <path d="M0,45 C150,80 350,10 500,45 L500,70 L0,70 Z" fill="rgba(255,255,255,0.05)" />
        </svg>
        <svg className="pointer-events-none absolute -top-6 -right-6 opacity-20" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="140" cy="40" r="30" stroke="#fff" strokeWidth="2" /><circle cx="140" cy="40" r="52" stroke="#fff" strokeWidth="1.5" /><circle cx="140" cy="40" r="74" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 -m-2.5 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 72%)' }} />
              <img src="/logo.png" alt="SentriCore" className="relative w-12 h-12 object-contain" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white/75 text-sm font-medium leading-none mb-1">Hello,</p>
              <p className="text-white text-2xl font-extrabold leading-tight truncate">{user.name || 'Guard'}!</p>
            </div>
          </div>
          <button onClick={() => navigate('/notifications')} className="relative w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-white" />
          </button>
        </div>
      </header>

      <div className="px-5 -mt-4 relative">
        {/* Shift banner */}
        <div className="bg-white rounded-3xl shadow-lg px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
            <Clock size={22} style={{ color: TEAL }} />
          </div>
          <div className="min-w-0">
            {onDuty ? (
              <>
                <p className="font-extrabold text-sm" style={{ color: DARK }}>You're currently on duty until {endLabel || '—'}</p>
                <p className="text-xs text-ink/60">{remaining ? `Shift ends in ${remaining}` : 'Shift ending soon'}</p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-sm" style={{ color: DARK }}>You're currently off duty</p>
                <p className="text-xs text-ink/60">{hasShift ? `Assigned: ${fmt12(shift.shiftStart)} - ${endLabel}` : 'No shift assigned yet'}</p>
              </>
            )}
          </div>
        </div>

        {/* Announcements — resident design */}
        <div className="bg-white rounded-3xl p-5 shadow-lg mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold" style={{ color: DARK }}>Announcements</h2>
            {announcements.length > 0 && (
              <button onClick={() => setShowAnnouncements(true)} className="text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: TEAL, color: '#F5F2E9', border: '1px solid rgba(255,255,255,0.5)' }}>View All</button>
            )}
          </div>
          {announcements.length === 0 ? (
            <div className="text-center py-6"><div className="flex justify-center mb-2"><Megaphone size={28} style={{ color: TEAL }} /></div>
              <p className="font-semibold text-sm" style={{ color: DARK }}>No announcements right now.</p></div>
          ) : (
            <div>{announcements.slice(0, 3).map((a, i) => (
              <div key={a.announcement_id || i}>
                <div className="flex items-center gap-3 py-2.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.10)' }}><AnnIcon a={a} size={18} style={{ color: TEAL }} /></div>
                  <p className="font-semibold text-sm truncate" style={{ color: DARK }}>{a.title}</p>
                </div>
                {i < Math.min(announcements.length, 3) - 1 && <div className="border-b border-gray-100" />}
              </div>
            ))}</div>
          )}
        </div>

        {/* Quick Actions — 2 */}
        <h3 className="text-lg font-extrabold mt-7 mb-3" style={{ color: DARK }}>How Can We Help You?</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((q) => (
            <button key={q.label} onClick={q.action} className="bg-white rounded-3xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-[0.98] transition">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}><q.Icon size={24} style={{ color: TEAL }} /></div>
              <span className="text-sm font-bold text-center leading-tight" style={{ color: DARK }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Today's Schedule */}
        <h3 className="text-lg font-extrabold mt-7 mb-3" style={{ color: DARK }}>Today's Schedule</h3>

        {/* Calendar — own elevation */}
        <div className="bg-white rounded-3xl p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <button onClick={() => scrollDays(-1)} className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div id="guard-day-scroll" className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {monthDays.map((d) => {
                const isActive = d.dayNum === selectedDay; const isToday = d.dayNum === today.getDate();
                return (
                  <button key={d.dayNum} id={isToday ? 'guard-today-cell' : undefined} onClick={() => setSelectedDay(d.dayNum)}
                          className={`flex flex-col items-center rounded-2xl px-3 py-2 min-w-[56px] shadow-sm shrink-0 ${isActive ? 'text-white' : 'text-ink'} ${!isActive && !isToday ? 'bg-white border border-gray-100' : ''}`}
                          style={isActive ? { backgroundColor: TEAL } : isToday ? { backgroundColor: '#CFE3DF' } : {}}>
                    <span className="text-[10px] font-semibold">{d.dayLabel}</span><span className="text-xl font-extrabold">{d.dayNum}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => scrollDays(1)} className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">›</button>
          </div>
        </div>

        {/* Weekly Expected Visitors chart */}
        <div className="bg-white rounded-3xl p-5 shadow-lg mt-4">
          <h3 className="text-lg font-extrabold" style={{ color: DARK }}>WEEKLY EXPECTED VISITORS</h3>
          <p className="text-xs text-ink/50 mb-2">This week · Mon–Sun</p>
          <div style={{ width: '100%', height: 190 }}>
            <ResponsiveContainer>
              <LineChart data={weekChart} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="expected" stroke={TEAL} strokeWidth={3} dot={{ r: 4, fill: TEAL }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tally — teal gradient, 3 */}
        <div className="rounded-3xl shadow-lg mt-4 grid grid-cols-3 text-white" style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}><CalendarClock size={22} className="text-white" /></div>
            <p className="text-4xl font-extrabold leading-none mb-1">{expectedToday}</p>
            <p className="text-xs font-semibold text-white/90">Expected Today</p>
          </div>
          <div className="p-5 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', borderRight: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}><Users size={22} className="text-white" /></div>
            <p className="text-4xl font-extrabold leading-none mb-1">{activeVisitors}</p>
            <p className="text-xs font-semibold text-white/90">Active Visitors</p>
          </div>
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}><ShieldAlert size={22} className="text-white" /></div>
            <p className="text-4xl font-extrabold leading-none mb-1">{totalToday}</p>
            <p className="text-xs font-semibold text-white/90">Total Today</p>
          </div>
        </div>

        {/* List — search + toggle + GroupList */}
        <div className="bg-white rounded-3xl p-5 shadow-lg mt-4 mb-4">
          <div className="flex items-center gap-3 rounded-full px-5 py-3" style={{ backgroundColor: '#F5F2E9' }}>
            <Search size={18} className="text-ink/40" />
            <input value={schedSearch} onChange={(e) => setSchedSearch(e.target.value)} placeholder="Search name" className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent text-sm" />
          </div>
          <div className="flex gap-2 mt-4">
            {['EXPECTED', 'ACTIVE'].map((tb) => (
              <button key={tb} onClick={() => setListTab(tb)} className="flex-1 py-2 rounded-full text-xs font-bold"
                      style={listTab === tb ? { backgroundColor: TEAL, color: '#fff' } : { backgroundColor: '#fff', color: DARK, border: '1px solid #e5e7eb' }}>{tb}</button>
            ))}
          </div>
          <div className="max-h-[46vh] overflow-y-auto mt-4">
            <GroupList registrations={dayRegs} which={listTab} search={schedSearch}
                       emptyText={listTab === 'ACTIVE' ? 'No active visitors.' : 'No expected visitors.'} />
          </div>
        </div>
      </div>

      <GuardBottomNav active="home" />

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}

      {/* Contact Resident modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5" onClick={() => setShowContact(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 relative max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h3 className="text-lg font-extrabold mb-1" style={{ color: DARK }}>Contact Resident</h3>
            <p className="text-ink/60 text-xs mb-3">Tap Call to reach a resident.</p>
            <div className="flex items-center gap-2 rounded-full px-4 py-2 mb-3" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={16} className="text-ink/40" />
              <input value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)} placeholder="Search resident name" className="flex-1 outline-none text-sm bg-transparent text-ink placeholder-ink/40" />
            </div>
            <div className="overflow-y-auto space-y-2">
              {residents.filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase())).length === 0 ? (
                <p className="text-center text-ink/50 py-6 text-sm">No residents found.</p>
              ) : residents.filter((r) => (r.name || '').toLowerCase().includes(residentSearch.toLowerCase())).map((r) => (
                <div key={r.residentId} className="border border-gray-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0"><p className="font-bold text-ink text-sm truncate">{r.name}</p>
                    <p className="text-xs text-ink/60 truncate">{r.address}</p><p className="text-xs text-ink/60">{r.contact || '—'}</p></div>
                  <button onClick={() => callResident(r)} className="text-white text-[11px] font-bold px-4 py-2 rounded-full inline-flex items-center gap-1 shrink-0" style={{ backgroundColor: '#1a5fa8' }}>
                    <Phone size={14} /> Call
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CALL RESULT — pagkatapos tumawag sa resident */}
      {callResult && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6" onClick={() => setCallResult(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCallResult(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h2 className="text-base font-extrabold text-ink text-center mt-2 mb-4">CALL RESULT</h2>
            <div className="border border-gray-200 rounded-xl p-3 mb-2">
              <p className="font-bold text-ink text-sm">{callResult.name}</p>
              <p className="text-xs text-ink/60">Address: {callResult.address}</p>
              <p className="text-xs text-ink/60">Contact: {callResult.contact || '—'}</p>
            </div>
            <p className="text-[11px] text-ink/60 text-center mb-4 px-2">
              Kung pinapapasok ng resident ang bisita, i-register bilang walk-in (active). Kung hindi, bumalik sa home.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => {
                        const r = callResult;
                        setCallResult(null);
                        navigate(`/guard-verify?unlisted=1&rid=${r.residentId || ''}&rn=${encodeURIComponent(r.name || '')}&ra=${encodeURIComponent(r.address || '')}&rc=${encodeURIComponent(r.contact || '')}`);
                      }}
                      className="w-full py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>REGISTER VISITOR</button>
              <button onClick={() => setCallResult(null)}
                      className="w-full py-3 rounded-full text-sm font-bold text-ink border border-gray-300 bg-white">GO BACK HOME</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
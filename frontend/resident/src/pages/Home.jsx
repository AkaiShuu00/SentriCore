import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import AnnouncementsModal from '../components/AnnouncementsModal';
import { getMyRegistrations, getAnnouncements, getNotifications, notifyGatePickup } from '../api';
import { useT, LangToggle } from '../i18n';
import {
  Bell, Megaphone, CalendarClock, Users, Phone, MessageSquareWarning, DoorOpen, Inbox,
} from 'lucide-react';

const TEAL = '#0F6E6E';
const CREAM = '#F5F2E9';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useT();
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  const firstName = (user.name || 'Resident').split(' ')[0];

  const [unread, setUnread] = useState(0);
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifyGate, setShowNotifyGate] = useState(false);
  const [rideHailing, setRideHailing] = useState(null);
  const [notifying, setNotifying] = useState(false);

  // ── Real data from DB ──
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyRegistrations()
      .then((res) => setRegistrations(res.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your visitors.'))
      .finally(() => setLoading(false));
  }, []);

  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    getNotifications().then((res) => setUnread(res.data?.unread || 0)).catch(() => setUnread(0));
  }, []);

  const year = today.getFullYear();
  const month = today.getMonth();
  const isoToday = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // I-flatten ang registrations → isang row bawat visitor (per-visitor status)
  const allRows = registrations.flatMap((r) => {
    const isDelivery = r.registration_type === 'Delivery';
    const expDate = (r.expected_date || '').slice(0, 10);
    const vlist = r.visitors && r.visitors.length
      ? r.visitors
      : [{ name: isDelivery ? 'Delivery Rider' : '—', status: r.status || 'Expected' }];
    return vlist.map((v) => ({
      name: typeof v === 'string' ? v : v.name,
      type: isDelivery ? 'Delivery' : 'Visitor',
      purpose: r.purpose || (isDelivery ? 'Delivery' : 'N/A'),
      status: (typeof v === 'string' ? (r.status || 'Expected') : v.status).toUpperCase(),
      expectedDate: expDate,
    }));
  });

  // Stats = base sa TODAY (Expected + Active lang)
  const todayRows = allRows.filter((s) => s.expectedDate === isoToday);
  const activeVisitorsCount = todayRows.filter((s) => s.status === 'ACTIVE').length;
  const expectedTodayCount = todayRows.filter((s) => s.status === 'EXPECTED').length;

  // Day strip
  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    monthDays.push({ dayNum: i, dayLabel: DAY_LABELS[dateObj.getDay()] });
  }
  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Status badge styles — malambot na kulay (walang matingkad na dilaw/pula)
  const statusStyle = {
    ACTIVE:   { backgroundColor: '#D6EAD9', color: '#1e6b2e' },
    EXPECTED: { backgroundColor: '#DCECE9', color: '#0F6E6E' },
    DEPARTED: { backgroundColor: '#E5E7EB', color: '#6b7280' },
  };

  const scrollDates = (dir) => {
    const el = document.getElementById('day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };
  useEffect(() => {
    const el = document.getElementById('home-today-cell');
    if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, [loading]);

  const selectedISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const daySchedule = allRows.filter((s) => s.expectedDate === selectedISO);

  // Quick actions (4) — kasama na ang Notify Gate
  const quickActions = [
    { Icon: CalendarClock, label: t('Expected Visitors', 'Inaasahang Bisita'), action: () => navigate('/schedule') },
    { Icon: Phone, label: t('Contact Guard', 'Tawagan ang Guard'), action: () => navigate('/contact-guard') },
    { Icon: MessageSquareWarning, label: t('Complaints', 'Reklamo'), action: () => navigate('/complaints') },
    { Icon: DoorOpen, label: t('Notify Gate', 'Ipaalam sa Gate'), action: () => { setRideHailing(null); setShowNotifyGate(true); } },
  ];

  return (
    <div className="min-h-screen bg-cream pb-24 max-w-md mx-auto relative">
      {/* ── Header: teal gradient + subtle waves ── */}
      <header className="relative overflow-hidden px-5 pt-7 pb-14 rounded-b-[32px]"
              style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
        {/* decorative wave band (bottom) */}
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 500 70"
             preserveAspectRatio="none" style={{ height: '52px' }}>
          <path d="M0,35 C130,75 370,-5 500,35 L500,70 L0,70 Z" fill="rgba(255,255,255,0.07)" />
          <path d="M0,45 C150,80 350,10 500,45 L500,70 L0,70 Z" fill="rgba(255,255,255,0.05)" />
        </svg>
        {/* faint top-right ripples */}
        <svg className="pointer-events-none absolute -top-6 -right-6 opacity-20" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="140" cy="40" r="30" stroke="#fff" strokeWidth="2" />
          <circle cx="140" cy="40" r="52" stroke="#fff" strokeWidth="1.5" />
          <circle cx="140" cy="40" r="74" stroke="#fff" strokeWidth="1" />
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="SentriCore" className="w-11 h-11 object-contain shrink-0"
                 style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }} />
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">{t('Hello,', 'Kumusta,')}</p>
              <p className="text-white text-xl font-extrabold leading-tight truncate">{firstName}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LangToggle />
            <button onClick={() => navigate('/notifications')}
                    className="relative w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Bell size={20} className="text-white" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-4 relative">
        {/* ── Announcements (white card + View Details) ── */}
        <div className="bg-white rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold" style={{ color: TEAL }}>{t('Announcements', 'Mga Anunsyo')}</h2>
            {announcements.length > 0 && (
              <button onClick={() => setShowAnnouncements(true)}
                      className="text-xs font-bold px-4 py-2 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: TEAL }}>
                {t('View Details', 'Tingnan')}
              </button>
            )}
          </div>
          {announcements.length === 0 ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-2"><Megaphone size={28} style={{ color: TEAL }} /></div>
              <p className="font-semibold text-sm text-ink">{t('No announcements yet', 'Wala pang anunsyo')}</p>
              <p className="text-ink/50 text-xs mt-1">{t('New community announcements will appear here.', 'Dito lalabas ang mga bagong anunsyo.')}</p>
            </div>
          ) : (
            <div>
              {announcements.slice(0, 3).map((a, i) => (
                <div key={a.announcement_id || i}>
                  <div className="flex items-center gap-3 py-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.10)' }}>
                      <Megaphone size={18} style={{ color: TEAL }} />
                    </div>
                    <p className="font-semibold text-sm text-ink truncate">{a.title}</p>
                  </div>
                  {i < Math.min(announcements.length, 3) - 1 && <div className="border-b border-gray-100" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Split box: Expected Today + Active Visitors (cream bg, teal font) ── */}
        <div className="rounded-3xl shadow-sm mt-4 grid grid-cols-2" style={{ backgroundColor: CREAM }}>
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
              <CalendarClock size={22} style={{ color: TEAL }} />
            </div>
            <p className="text-3xl font-extrabold" style={{ color: TEAL }}>{expectedTodayCount}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: TEAL }}>{t('Expected Today', 'Inaasahan Ngayon')}</p>
          </div>
          <div className="p-5 text-center" style={{ borderLeft: '1px solid rgba(15,110,110,0.15)' }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
              <Users size={22} style={{ color: TEAL }} />
            </div>
            <p className="text-3xl font-extrabold" style={{ color: TEAL }}>{activeVisitorsCount}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: TEAL }}>{t('Active Visitors', 'Aktibong Bisita')}</p>
          </div>
        </div>

        {/* ── How Can We Help You? (quick actions, 4, cream/teal) ── */}
        <h3 className="text-lg font-extrabold text-ink mt-7 mb-3">{t('How Can We Help You?', 'Paano Ka Namin Matutulungan?')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((q) => (
            <button key={q.label} onClick={q.action}
                    className="rounded-3xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-[0.98] transition"
                    style={{ backgroundColor: CREAM }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
                <q.Icon size={24} style={{ color: TEAL }} />
              </div>
              <span className="text-sm font-bold text-center leading-tight" style={{ color: TEAL }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* ── Today's Schedule ── */}
        <div className="flex items-center justify-between mt-8 mb-1">
          <h3 className="text-xl font-extrabold text-ink">{t("Today's Schedule", 'Iskedyul Ngayon')}</h3>
          <button onClick={() => navigate('/schedule')} className="text-white text-xs font-bold px-4 py-2 rounded-full" style={{ backgroundColor: TEAL }}>
            {t('VIEW ALL', 'LAHAT')}
          </button>
        </div>
        <p className="text-base font-semibold text-ink/70 mb-3">{monthYear}</p>

        <div className="flex items-center gap-2">
          <button onClick={() => scrollDates(-1)} className="text-ink/40 text-2xl shrink-0">‹</button>
          <div id="day-scroll" className="flex gap-2 overflow-x-auto flex-1 pb-1" style={{ scrollbarWidth: 'none' }}>
            {monthDays.map((d) => {
              const isActive = d.dayNum === selectedDay;
              const isToday = d.dayNum === today.getDate();
              const style = isActive ? { backgroundColor: TEAL } : isToday ? { backgroundColor: '#CFE3DF' } : {};
              return (
                <button key={d.dayNum} id={isToday ? 'home-today-cell' : undefined}
                        onClick={() => setSelectedDay(d.dayNum)}
                        className={`flex flex-col items-center rounded-2xl px-4 py-3 min-w-[64px] shadow-sm shrink-0 ${isActive ? 'text-white' : 'text-ink'} ${!isActive && !isToday ? 'bg-white' : ''}`}
                        style={style}>
                  <span className="text-xs font-semibold">{d.dayLabel}</span>
                  <span className="text-2xl font-extrabold">{d.dayNum}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollDates(1)} className="text-ink/40 text-2xl shrink-0">›</button>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm mt-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-ink/50">{t('Loading your visitors…', 'Naglo-load ng iyong mga bisita…')}</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 text-sm">{error}</div>
          ) : daySchedule.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-2"><Inbox size={36} className="text-ink/40" /></div>
              <p className="text-ink/60 font-semibold">{t('No visitors on this day', 'Walang bisita sa araw na ito')}</p>
              <p className="text-ink/40 text-sm mt-1">{t('Pre-register a visitor to see them here.', 'Mag-pre-register ng bisita para makita sila rito.')}</p>
            </div>
          ) : (
            <>
              {daySchedule.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
                  <div className="text-xs font-bold text-ink whitespace-pre-line text-center w-16 shrink-0">-----</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink truncate">{s.name}</p>
                    <p className="text-sm text-ink/60">{s.type}</p>
                    <p className="text-sm text-ink/60">Purpose: {s.purpose}</p>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={statusStyle[s.status] || { backgroundColor: '#E5E7EB', color: '#6b7280' }}>
                    {s.status}
                  </span>
                </div>
              ))}
              <p className="text-center text-ink/50 text-sm py-2">{t('--- Nothing follows ---', '--- Wala nang sumusunod ---')}</p>
            </>
          )}
        </div>
      </div>

      <BottomNav active="home" />

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}

      {/* Notify Gate modal */}
      {showNotifyGate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-3"><DoorOpen size={44} className="text-ink" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-2">{t('Are you waiting for a pick-up?', 'Naghihintay ka ba ng sundo?')}</h3>
            <p className="text-ink/60 text-sm mb-5">{t("This will notify the guard that you're waiting at the gate.", 'Ipapaalam nito sa guard na naghihintay ka sa gate.')}</p>
            <p className="text-sm font-bold text-ink mb-2">{t('Is this a ride-hailing pickup?', 'Ride-hailing ba ang sundo? (hal. Grab)')}</p>
            <div className="flex gap-2 justify-center mb-6">
              <button onClick={() => setRideHailing(true)}
                      className={`px-6 py-2 rounded-full text-sm font-bold border ${rideHailing === true ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                      style={rideHailing === true ? { backgroundColor: '#CDE7DE' } : {}}>
                {t('YES', 'OO')}
              </button>
              <button onClick={() => setRideHailing(false)}
                      className={`px-6 py-2 rounded-full text-sm font-bold border ${rideHailing === false ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                      style={rideHailing === false ? { backgroundColor: '#CDE7DE' } : {}}>
                {t('NO', 'HINDI')}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNotifyGate(false)}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                {t('CANCEL', 'KANSELAHIN')}
              </button>
              <button disabled={notifying} onClick={async () => {
                        if (rideHailing === null) { alert(t('Please select if this is a ride-hailing pickup.', 'Pakipili kung ride-hailing ang sundo.')); return; }
                        setNotifying(true);
                        try {
                          await notifyGatePickup({ rideHailing });
                          setShowNotifyGate(false);
                          alert(t('Gate notified! The guard has been informed that you are waiting for a pick-up.', 'Naipaalam na sa gate! Alam na ng guard na naghihintay ka ng sundo.'));
                        } catch (err) {
                          alert(err.response?.data?.message || t('Failed to notify the gate. Please try again.', 'Hindi naipaalam sa gate. Pakisubukan ulit.'));
                        } finally {
                          setNotifying(false);
                        }
                      }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#112D31' }}>
                {notifying ? t('NOTIFYING…', 'IPINAPAALAM…') : t('NOTIFY GATE', 'IPAALAM SA GATE')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import AnnouncementsModal from '../components/AnnouncementsModal';
import { getMyRegistrations, getAnnouncements, getNotifications, notifyGatePickup } from '../api';
import { useT, LangToggle } from '../i18n';
import { Bell, Megaphone, CalendarClock, Users, Phone, MessageSquareWarning, DoorOpen } from 'lucide-react';

const DARK = '#0A4A4A';   // dark teal (font)
const TEAL = '#0F6E6E';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useT();
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  const firstName = (user.name || 'Resident').split(' ')[0];

  const [unread, setUnread] = useState(0);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifyGate, setShowNotifyGate] = useState(false);
  const [rideHailing, setRideHailing] = useState(null);
  const [notifying, setNotifying] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    getMyRegistrations().then((res) => setRegistrations(res.data || [])).catch(() => setRegistrations([]));
    getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => setAnnouncements([]));
    getNotifications().then((res) => setUnread(res.data?.unread || 0)).catch(() => setUnread(0));
  }, []);

  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // I-flatten ang registrations → isang row bawat visitor
  const allRows = registrations.flatMap((r) => {
    const isDelivery = r.registration_type === 'Delivery';
    const expDate = (r.expected_date || '').slice(0, 10);
    const vlist = r.visitors && r.visitors.length
      ? r.visitors
      : [{ name: isDelivery ? 'Delivery Rider' : '—', status: r.status || 'Expected' }];
    return vlist.map((v) => ({
      status: (typeof v === 'string' ? (r.status || 'Expected') : v.status).toUpperCase(),
      expectedDate: expDate,
    }));
  });
  const todayRows = allRows.filter((s) => s.expectedDate === isoToday);
  const activeVisitorsCount = todayRows.filter((s) => s.status === 'ACTIVE').length;
  const expectedTodayCount = todayRows.filter((s) => s.status === 'EXPECTED').length;

  // Quick actions (3) — horizontal
  const quickActions = [
    { Icon: Phone, label: t('Contact Guard', 'Tawagan ang Guard'), action: () => navigate('/contact-guard') },
    { Icon: MessageSquareWarning, label: t('Complaints', 'Reklamo'), action: () => navigate('/complaints') },
    { Icon: DoorOpen, label: t('Notify Gate', 'Ipaalam sa Gate'), action: () => { setRideHailing(null); setShowNotifyGate(true); } },
  ];

  return (
    <div className="min-h-screen bg-cream pb-24 max-w-md mx-auto relative">
      {/* ── Header: teal gradient + subtle waves ── */}
      <header className="relative overflow-hidden px-5 pt-7 pb-14 rounded-b-[32px]"
              style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 500 70"
             preserveAspectRatio="none" style={{ height: '52px' }}>
          <path d="M0,35 C130,75 370,-5 500,35 L500,70 L0,70 Z" fill="rgba(255,255,255,0.07)" />
          <path d="M0,45 C150,80 350,10 500,45 L500,70 L0,70 Z" fill="rgba(255,255,255,0.05)" />
        </svg>
        <svg className="pointer-events-none absolute -top-6 -right-6 opacity-20" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="140" cy="40" r="30" stroke="#fff" strokeWidth="2" />
          <circle cx="140" cy="40" r="52" stroke="#fff" strokeWidth="1.5" />
          <circle cx="140" cy="40" r="74" stroke="#fff" strokeWidth="1" />
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo + light gradient glow (mas visible) */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 -m-2.5 rounded-full"
                   style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 72%)' }} />
              <img src="/logo.png" alt="SentriCore" className="relative w-12 h-12 object-contain"
                   style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white/75 text-sm font-medium leading-none mb-1">{t('Hello,', 'Kumusta,')}</p>
              <p className="text-white text-2xl font-extrabold leading-tight truncate">{firstName}!</p>
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
        {/* ── Announcements (white card + View All) ── */}
        <div className="bg-white rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold" style={{ color: DARK }}>{t('Announcements', 'Mga Anunsyo')}</h2>
            {announcements.length > 0 && (
              <button onClick={() => setShowAnnouncements(true)}
                      className="text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: TEAL, color: '#F5F2E9', border: '1px solid rgba(255,255,255,0.5)' }}>
                {t('View All', 'Lahat')}
              </button>
            )}
          </div>
          {announcements.length === 0 ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-2"><Megaphone size={28} style={{ color: TEAL }} /></div>
              <p className="font-semibold text-sm" style={{ color: DARK }}>{t('No announcements yet', 'Wala pang anunsyo')}</p>
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
                    <p className="font-semibold text-sm truncate" style={{ color: DARK }}>{a.title}</p>
                  </div>
                  {i < Math.min(announcements.length, 3) - 1 && <div className="border-b border-gray-100" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Split box: Expected Today + Active Visitors (white bg, dark teal) ── */}
        <div className="bg-white rounded-3xl shadow-lg mt-4 grid grid-cols-2">
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
              <CalendarClock size={22} style={{ color: TEAL }} />
            </div>
            <p className="text-3xl font-extrabold" style={{ color: DARK }}>{expectedTodayCount}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: DARK }}>{t('Expected Today', 'Inaasahan Ngayon')}</p>
          </div>
          <div className="p-5 text-center" style={{ borderLeft: '1px solid rgba(10,74,74,0.12)' }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
              <Users size={22} style={{ color: TEAL }} />
            </div>
            <p className="text-3xl font-extrabold" style={{ color: DARK }}>{activeVisitorsCount}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: DARK }}>{t('Active Visitors', 'Aktibong Bisita')}</p>
          </div>
        </div>

        {/* ── How Can We Help You? (3 quick actions, horizontal, white bg, dark teal) ── */}
        <h3 className="text-lg font-extrabold mt-7 mb-3" style={{ color: DARK }}>{t('How Can We Help You?', 'Paano Ka Namin Matutulungan?')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((q) => (
            <button key={q.label} onClick={q.action}
                    className="bg-white rounded-3xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-[0.98] transition">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
                <q.Icon size={24} style={{ color: TEAL }} />
              </div>
              <span className="text-xs font-bold text-center leading-tight" style={{ color: DARK }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="home" />

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}

      {/* Notify Gate modal */}
      {showNotifyGate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-3"><DoorOpen size={44} style={{ color: DARK }} /></div>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: DARK }}>{t('Are you waiting for a pick-up?', 'Naghihintay ka ba ng sundo?')}</h3>
            <p className="text-ink/60 text-sm mb-5">{t("This will notify the guard that you're waiting at the gate.", 'Ipapaalam nito sa guard na naghihintay ka sa gate.')}</p>
            <p className="text-sm font-bold mb-2" style={{ color: DARK }}>{t('Is this a ride-hailing pickup?', 'Ride-hailing ba ang sundo? (hal. Grab)')}</p>
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
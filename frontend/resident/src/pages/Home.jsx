import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import AnnouncementsModal from '../components/AnnouncementsModal';
import { getMyRegistrations } from '../api';

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [search, setSearch] = useState('');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifyGate, setShowNotifyGate] = useState(false);
  const [rideHailing, setRideHailing] = useState(null);

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

  // ── Announcements (sample muna — ikokonekta sa backend after) ──
  const announcements = [
    { icon: '🔥', bg: 'bg-white', text: 'Fire incident happening at Gemini Street' },
    { icon: '⚠️', bg: 'bg-white', text: 'Gate 1 temporarily closed' },
    { icon: '💧', bg: 'bg-yellow-100', text: 'Water interruption at 11:00 PM today, June 2, 2026' },
    { icon: '🧑', bg: 'bg-red-100', text: 'Homeowners meeting today at clubhouse, 10:30 AM' },
  ];

  const isoToday = today.toISOString().slice(0, 10);

  // I-flatten ang registrations → isang row bawat visitor
  const allRows = registrations.flatMap((r) => {
    const isDelivery = r.registration_type === 'Delivery';
    const expDate = (r.expected_date || '').slice(0, 10);
    const names = r.visitors && r.visitors.length ? r.visitors : [isDelivery ? 'Delivery Driver' : '—'];
    return names.map((name) => ({
      name,
      type: isDelivery ? 'Delivery' : 'Visitor',
      purpose: r.purpose || (isDelivery ? 'Delivery' : 'N/A'),
      status: (r.status || 'Expected').toUpperCase(),
      expectedDate: expDate,
    }));
  });

  // "Today's Schedule" = mga naka-schedule ngayong araw
  const schedule = allRows.filter((s) => s.expectedDate === isoToday);

  // ── Derived counts para sa stat cards ──
  const todaysVisitorsCount = schedule.filter((s) => s.status === 'ACTIVE').length;
  const expectedTodayCount = schedule.filter((s) => s.status === 'EXPECTED').length;
  const visitHistoryCount = allRows.filter((s) => s.status === 'DEPARTED').length;

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

  const statusStyle = {
    ACTIVE: 'bg-green-100 text-green-700',
    EXPECTED: 'bg-yellow-100 text-yellow-700',
    DEPARTED: 'bg-red-100 text-red-700',
  };

  const scrollDates = (dir) => {
    const el = document.getElementById('day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  const filteredSchedule = schedule.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cream pb-24 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 rounded-b-3xl">
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-1 pr-5 py-1 shadow">
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center text-xl">👩</div>
          <span className="font-bold text-ink">{user.name || 'Resident'}</span>
        </div>
      </header>

      <div className="px-5">
        {/* Announcements */}
        <h2 className="text-xl font-extrabold text-ink mt-6 mb-3">ANNOUNCEMENTS</h2>
        <button onClick={() => setShowAnnouncements(true)}
             className="w-full text-left rounded-3xl p-5 shadow-lg text-white active:scale-[0.99] transition"
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
        </button>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl p-5 shadow mt-6">
          <h3 className="text-lg font-extrabold text-ink mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: '➕', label: 'Pre-Register', bg: 'bg-teal-100', action: () => navigate('/pre-register') },
              { icon: '📅', label: 'Expected Visitors', bg: 'bg-blue-100', action: () => navigate('/schedule') },
              { icon: '📞', label: 'Contact Guard', bg: 'bg-purple-100', action: () => navigate('/contact-guard') },
              { icon: '⚠️', label: 'Complaints', bg: 'bg-yellow-100', action: () => navigate('/complaints') },
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

        {/* Notify Gate */}
        <button onClick={() => { setRideHailing(null); setShowNotifyGate(true); }}
                className="w-full mt-4 rounded-3xl p-5 shadow flex items-center gap-4 active:scale-[0.99] transition"
                style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🚪</div>
          <div className="text-left">
            <p className="text-white font-extrabold text-lg leading-tight">Notify Gate</p>
            <p className="text-white/80 text-xs">Tell the guard you're waiting for a pick-up</p>
          </div>
        </button>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-teal-100 rounded-3xl p-4 shadow">
            <p className="text-sm text-ink">Today's Visitors</p>
            <p className="text-4xl font-extrabold text-ink my-2">{todaysVisitorsCount}</p>
            <div className="w-11 h-11 rounded-2xl bg-ink flex items-center justify-center text-white text-lg">👥</div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F1D88A' }}>
            <p className="text-sm text-ink">Expected Today</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a6d12' }}>{expectedTodayCount}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#B8901F' }}>📅</div>
          </div>
          <div className="rounded-3xl p-4 shadow" style={{ backgroundColor: '#F3C9C9' }}>
            <p className="text-sm text-ink">Visit History</p>
            <p className="text-4xl font-extrabold my-2" style={{ color: '#8a2b2b' }}>{visitHistoryCount}</p>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#A83232' }}>📄</div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="flex items-center justify-between mt-8 mb-1">
          <h3 className="text-xl font-extrabold text-ink">Today's Schedule</h3>
          <button onClick={() => navigate('/schedule')} className="text-white text-xs font-bold px-4 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
            VIEW ALL
          </button>
        </div>
        <p className="text-lg font-semibold text-ink mb-3">{monthYear}</p>

        {/* Day calendar */}
        <div className="flex items-center gap-2">
          <button onClick={() => scrollDates(-1)} className="text-ink/40 text-2xl shrink-0">‹</button>
          <div id="day-scroll" className="flex gap-2 overflow-x-auto flex-1 pb-1"
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

        {/* Schedule list */}
        <div className="bg-white rounded-3xl p-4 shadow mt-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-ink/50">Loading your visitors…</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 text-sm">{error}</div>
          ) : filteredSchedule.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-ink/60 font-semibold">No visitors scheduled today</p>
              <p className="text-ink/40 text-sm mt-1">Pre-register a visitor to see them here.</p>
            </div>
          ) : (
            <>
              {filteredSchedule.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
                  <div className="text-xs font-bold text-ink whitespace-pre-line text-center w-16 shrink-0">-----</div>
                  <div className="flex-1">
                    <p className="font-bold text-ink">{s.name}</p>
                    <p className="text-sm text-ink/60">{s.type}</p>
                    <p className="text-sm text-ink/60">Purpose: {s.purpose}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${statusStyle[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
              <p className="text-center text-ink/50 text-sm py-2">--- Nothing follows ---</p>
            </>
          )}
        </div>

        {/* Recent Visit History */}
        <h3 className="text-xl font-extrabold text-ink mt-8 mb-3">Recent Visit History</h3>
        <div className="bg-white rounded-3xl p-5 shadow">
          <div className="text-center py-6">
            <p className="text-4xl mb-2">🗂️</p>
            <p className="text-ink/60 font-semibold">No visit history yet</p>
            <p className="text-ink/40 text-sm mt-1">Completed visits will appear here.</p>
          </div>
        </div>
      </div>

      <BottomNav active="home" />

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}

      {/* Notify Gate modal */}
      {showNotifyGate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-3">🚪</div>
            <h3 className="text-xl font-extrabold text-ink mb-2">Are you waiting for a pick-up?</h3>
            <p className="text-ink/60 text-sm mb-5">
              This will notify the guard that you're waiting at the gate.
            </p>

            <p className="text-sm font-bold text-ink mb-2">Is this a ride-hailing pickup?</p>
            <div className="flex gap-2 justify-center mb-6">
              <button onClick={() => setRideHailing(true)}
                      className={`px-6 py-2 rounded-full text-sm font-bold border ${rideHailing === true ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                      style={rideHailing === true ? { backgroundColor: '#CDE7DE' } : {}}>
                YES
              </button>
              <button onClick={() => setRideHailing(false)}
                      className={`px-6 py-2 rounded-full text-sm font-bold border ${rideHailing === false ? 'text-ink border-transparent' : 'text-ink border-gray-300'}`}
                      style={rideHailing === false ? { backgroundColor: '#CDE7DE' } : {}}>
                NO
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNotifyGate(false)}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
                CANCEL
              </button>
              <button onClick={() => {
                        if (rideHailing === null) { alert('Please select if this is a ride-hailing pickup.'); return; }
                        const notif = {
                          id: Date.now(),
                          name: user.name || 'Resident',
                          address: user.address || '',
                          rideHailing,
                          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                        };
                        const existing = JSON.parse(localStorage.getItem('sentricore_gate_notifications') || '[]');
                        localStorage.setItem('sentricore_gate_notifications', JSON.stringify([notif, ...existing]));
                        setShowNotifyGate(false);
                        alert('Gate notified! The guard has been informed that you are waiting for a pick-up. ✅');
                      }}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#112D31' }}>
                NOTIFY GATE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import GuardBottomNav from '../../components/GuardBottomNav';
import AnnouncementsModal from '../../components/AnnouncementsModal';

export default function GuardProfile() {
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  // ── Sample data (iko-connect sa backend after) ──
  const guard = {
    name: user.name || 'Aiyana B. Fruto',
    role: 'Security Guard',
    employeeId: 'GD-1001',
    contact: '0917 123 4567',
    email: 'guardone@gmail.com',
    status: 'Active',
    duty: 'ON DUTY',
  };

  const assignment = {
    gate: 'Main Gate',
    gateSub: 'Gate 1',
    shift: 'Day Shift',
    shiftTime: '6:00 AM - 2:00 PM',
    shiftStatus: 'ONGOING',
    startedAt: 'Started at 6:00 AM',
  };

  const schedule = [
    { time: '06:00\nAM', title: 'Shift Start', sub: 'Day Shift at Gate 1', status: 'COMPLETED', color: '#B4E4BE', textColor: '#1e6b2e' },
    { time: '08:00\nAM', title: 'Break Time', sub: '30 minutes', status: 'UPCOMING', color: '#CFE3FB', textColor: '#1a4f8a' },
    { time: '12:00\nPM', title: 'Lunch Break', sub: '45 minutes', status: 'UPCOMING', color: '#F1D88A', textColor: '#8a6d12' },
  ];

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
        {/* Title */}
        <h1 className="text-2xl font-extrabold text-ink mt-6">GUARD PROFILE</h1>
        <p className="text-ink/60 mt-1 mb-4">View your profile, shift details, and assignments</p>

        {/* Profile card */}
        <div className="rounded-3xl p-5 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <div className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-20 rounded-full bg-yellow-200 flex items-center justify-center text-4xl border-2 border-white/40">👮</div>
              <span className="mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-teal-300 text-ink">{guard.duty}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold">{guard.name.toUpperCase()}</h2>
              <p className="text-white/80 text-sm mb-2">{guard.role}</p>
              <p className="text-sm"><span className="font-bold">Employee ID:</span> {guard.employeeId}</p>
              <p className="text-sm"><span className="font-bold">Contact Number:</span> {guard.contact}</p>
              <p className="text-sm"><span className="font-bold">Email Address:</span> {guard.email}</p>
              <p className="text-sm"><span className="font-bold">Status:</span> {guard.status}</p>
            </div>
          </div>
        </div>

        {/* Assignment card */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4 flex">
          <div className="flex-1 pr-2">
            <p className="text-xs font-bold text-ink mb-2">Assigned Gate</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg">🏛️</div>
              <div>
                <p className="font-bold text-ink text-sm">{assignment.gate}</p>
                <p className="text-xs text-ink/60">{assignment.gateSub}</p>
              </div>
            </div>
          </div>
          <div className="border-l border-gray-200" />
          <div className="flex-1 px-2">
            <p className="text-xs font-bold text-ink mb-2">Current Shift</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg">📅</div>
              <div>
                <p className="font-bold text-ink text-sm">{assignment.shift}</p>
                <p className="text-xs text-ink/60">{assignment.shiftTime}</p>
              </div>
            </div>
          </div>
          <div className="border-l border-gray-200" />
          <div className="flex-1 pl-2">
            <p className="text-xs font-bold text-ink mb-2">Shift Status</p>
            <p className="font-extrabold text-sm" style={{ color: '#1e8e3e' }}>{assignment.shiftStatus}</p>
            <p className="text-xs text-ink/60 mt-1">{assignment.startedAt}</p>
          </div>
        </div>

        {/* End shift banner */}
        <div className="rounded-2xl p-4 mt-4 flex items-center gap-3" style={{ backgroundColor: '#FBE0E0' }}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shrink-0">🚪</div>
          <div className="flex-1">
            <p className="font-bold text-ink text-sm">End your shift when your turnover is complete.</p>
            <p className="text-xs text-ink/60">This will log your time-out and update your status</p>
          </div>
          <button onClick={() => alert('End shift — iko-connect sa backend')}
                  className="text-white font-bold text-xs px-4 py-2 rounded-full shrink-0" style={{ backgroundColor: '#C0392B' }}>
            END SHIFT
          </button>
        </div>

        {/* Today's schedule (guard shift schedule) */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4">
          <h3 className="text-xl font-extrabold text-ink mb-4">TODAY'S SCHEDULE</h3>
          {schedule.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3">
              <div className="text-sm font-extrabold text-ink text-center whitespace-pre-line w-16 shrink-0">{s.time}</div>
              <div className="flex-1">
                <p className="font-bold text-ink">{s.title}</p>
                <p className="text-sm text-ink/60">{s.sub}</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: s.color, color: s.textColor }}>
                {s.status}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h3 className="text-xl font-extrabold text-ink mt-6 mb-3">QUICK ACTIONS</h3>
        <div className="bg-white rounded-3xl p-5 shadow mb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '📢', label: 'Announcements', bg: 'bg-teal-100', action: () => setShowAnnouncements(true) },
              { icon: '🔄', label: 'Request Turnover', bg: 'bg-blue-100', action: () => alert('Request Turnover') },
              { icon: '📋', label: 'Post Orders', bg: 'bg-purple-100', action: () => alert('Post Orders') },
            ].map((q) => (
              <button key={q.label} onClick={q.action} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl ${q.bg} flex items-center justify-center text-2xl mb-1`}>{q.icon}</div>
                <span className="text-xs font-medium text-ink leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAnnouncements && <AnnouncementsModal onClose={() => setShowAnnouncements(false)} />}

      <GuardBottomNav active="profile" />
    </div>
  );
}
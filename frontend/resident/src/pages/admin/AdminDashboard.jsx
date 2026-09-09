import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';

// ── Sample data (iko-connect sa DB after) ──
const STATS = [
  { label: 'Active Visitors',   value: 24,  icon: '👥', bg: '#F1D88A', ring: '#E8C55E' },
  { label: "Today's Visitors",  value: 132, icon: '📋', bg: '#D9EDE4', ring: '#A9D5C6' },
  { label: 'Expected Visitor',  value: 59,  icon: '📅', bg: '#BFE3D6', ring: '#8FCDB8' },
  { label: 'Active Guards',     value: 2,   icon: '🛡️', bg: '#F3C79A', ring: '#E9AE71' },
];

const RECENT = [
  { text: 'Visitor Juana Dela Cruz logged entry · P-1052 · 10:12 AM', time: 'May 21' },
  { text: 'Guard Carlos Aquino ended shift at Gate 1 · 2:00 PM', time: 'May 21' },
  { text: 'Delivery logged for Unit C-8 · P-1049 · 9:30 AM', time: 'May 21' },
  { text: 'Resident Mary-Del Mercado added a pre-registration', time: 'May 21' },
  { text: 'Visitor P-1031 logged exit · 8:45 PM', time: 'May 20' },
];

const ANNOUNCEMENTS = [
  { icon: '🔥', text: 'Fire incident happening at Gemini Street' },
  { icon: '💧', text: 'Water interruption at 11:00 PM today, June 2, 2026' },
  { icon: '🧑', text: 'Homeowners meeting today at clubhouse, 10:30 AM' },
];

const DAY_LABELS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <AdminLayout>
      <div className="flex gap-6">
        {/* LEFT column */}
        <div className="flex-1 min-w-0">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl p-5 shadow-sm flex items-center gap-4" style={{ backgroundColor: s.bg }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-white/60"
                     style={{ boxShadow: `0 0 0 3px ${s.ring}` }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-ink leading-none">{s.value}</p>
                  <p className="text-sm font-semibold text-ink/70 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-ink">Recent Activity</h3>
              <button className="text-xs font-bold text-teal-700">View All</button>
            </div>
            <div className="space-y-3">
              {RECENT.map((r, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm shrink-0">•</div>
                  <p className="flex-1 text-sm text-ink/80">{r.text}</p>
                  <span className="text-[11px] text-ink/40 shrink-0">{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="w-80 shrink-0">
          {/* Calendar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-extrabold text-ink">{monthName}</p>
              <div className="flex gap-1">
                <button className="w-7 h-7 rounded-full bg-cream text-ink flex items-center justify-center text-sm">‹</button>
                <button className="w-7 h-7 rounded-full bg-cream text-ink flex items-center justify-center text-sm">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_LABELS.map((d) => (
                <span key={d} className="text-[10px] font-bold text-ink/40 py-1">{d}</span>
              ))}
              {cells.map((d, i) => (
                <button key={i} disabled={!d}
                        onClick={() => d && setSelectedDay(d)}
                        className={`aspect-square rounded-full text-xs font-semibold flex items-center justify-center
                          ${!d ? '' : d === selectedDay ? 'bg-teal-600 text-white' : 'text-ink hover:bg-cream'}`}>
                  {d || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Announcement panel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-ink">Announcement</h3>
              <button onClick={() => navigate('/admin-announcements')}
                      className="text-xs font-bold text-teal-700">View All</button>
            </div>
            <div className="space-y-3">
              {ANNOUNCEMENTS.map((a, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-lg shrink-0">{a.icon}</div>
                  <p className="flex-1 text-sm text-ink/80 leading-snug">{a.text}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/admin-announcements')}
                    className="w-full mt-4 bg-ink text-white font-bold text-sm py-2.5 rounded-full active:scale-95 transition">
              Post Announcement
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
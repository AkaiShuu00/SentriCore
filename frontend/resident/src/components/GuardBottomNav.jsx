import { useNavigate } from 'react-router-dom';
import { Home, CalendarDays, ClipboardList, User, ScanLine } from 'lucide-react';

// active: 'home' | 'schedule' | 'logs' | 'profile'
export default function GuardBottomNav({ active = 'home' }) {
  const navigate = useNavigate();

  const items = [
    { key: 'home',     Icon: Home,          label: 'Home',     to: '/guard-home' },
    { key: 'schedule', Icon: CalendarDays,  label: 'Schedule', to: '/guard-schedule' },
    { key: 'logs',     Icon: ClipboardList, label: 'Logs',     to: '/guard-logs' },
    { key: 'profile',  Icon: User,          label: 'Profile',  to: '/guard-profile' },
  ];

  const teal = '#0F6E6E';

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex items-center justify-around py-2 pb-4 z-40">
      {/* Left two */}
      {items.slice(0, 2).map((it) => {
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => navigate(it.to)} className="flex flex-col items-center px-3 min-w-[56px]">
            <it.Icon size={24} style={{ color: isActive ? teal : '#9ca3af' }} />
            {isActive && <span className="text-[10px] font-semibold" style={{ color: teal }}>{it.label}</span>}
          </button>
        );
      })}

      {/* Center — Verify / Scan */}
      <button
        onClick={() => navigate('/guard-verify')}
        className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center shadow-lg -mt-4 shrink-0"
      >
        <ScanLine size={26} />
      </button>

      {/* Right two */}
      {items.slice(2).map((it) => {
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => navigate(it.to)} className="flex flex-col items-center px-3 min-w-[56px]">
            <it.Icon size={24} style={{ color: isActive ? teal : '#9ca3af' }} />
            {isActive && <span className="text-[10px] font-semibold" style={{ color: teal }}>{it.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
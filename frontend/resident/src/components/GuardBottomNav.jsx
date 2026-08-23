import { useNavigate } from 'react-router-dom';

// active: 'home' | 'schedule' | 'logs' | 'profile'
export default function GuardBottomNav({ active = 'home' }) {
  const navigate = useNavigate();

  const items = [
    { key: 'home',     icon: '🏠', label: 'Home',     to: '/guard-home' },
    { key: 'schedule', icon: '📅', label: 'Schedule', to: '/guard-schedule' },
    { key: 'logs',     icon: '📋', label: 'Logs',     to: '/guard-logs' },
    { key: 'profile',  icon: '👤', label: 'Profile',  to: '/guard-profile' },
  ];

  const teal = '#0F6E6E';

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex items-center justify-around py-2 pb-4 z-40">
      {/* Left two */}
      {items.slice(0, 2).map((it) => {
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => navigate(it.to)} className="flex flex-col items-center px-3 min-w-[56px]">
            <span className="text-2xl" style={{ color: isActive ? teal : '#9ca3af' }}>{it.icon}</span>
            {isActive && <span className="text-[10px] font-semibold" style={{ color: teal }}>{it.label}</span>}
          </button>
        );
      })}

      {/* Center — Verify / Scan */}
      <button
        onClick={() => navigate('/guard-verify')}
        className="w-14 h-14 rounded-full bg-ink text-white text-2xl flex items-center justify-center shadow-lg -mt-4 shrink-0"
      >
        🔓
      </button>

      {/* Right two */}
      {items.slice(2).map((it) => {
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => navigate(it.to)} className="flex flex-col items-center px-3 min-w-[56px]">
            <span className="text-2xl" style={{ color: isActive ? teal : '#9ca3af' }}>{it.icon}</span>
            {isActive && <span className="text-[10px] font-semibold" style={{ color: teal }}>{it.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
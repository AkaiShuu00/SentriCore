import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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

  const NavBtn = ({ it }) => {
    const isActive = active === it.key;
    return (
      <button onClick={() => navigate(it.to)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full shrink-0">
        <it.Icon size={22} style={{ color: isActive ? teal : '#9ca3af' }} />
        <span className="text-[10px] font-semibold leading-none"
              style={{ color: isActive ? teal : '#9ca3af' }}>{it.label}</span>
      </button>
    );
  };

  // Portal papuntang document.body para hindi lumutang dahil sa transformed ancestor.
  const bar = (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ pointerEvents: 'none' }}>
      <div className="mx-auto w-full max-w-md relative" style={{ pointerEvents: 'auto' }}>
        <nav
          className="w-full h-16 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex items-center justify-around"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {items.slice(0, 2).map((it) => <NavBtn key={it.key} it={it} />)}
          <span className="w-14 shrink-0" />
          {items.slice(2).map((it) => <NavBtn key={it.key} it={it} />)}
        </nav>

        {/* Center — Verify / Scan */}
        <button
          onClick={() => navigate('/guard-verify')}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center shadow-lg"
        >
          <ScanLine size={26} />
        </button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
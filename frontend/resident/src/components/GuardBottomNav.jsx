import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Home, CalendarDays, ClipboardList, User, ScanLine, LogIn, LogOut } from 'lucide-react';

// active: 'home' | 'schedule' | 'logs' | 'profile'
export default function GuardBottomNav({ active = 'home' }) {
  const navigate = useNavigate();
  const [showChoice, setShowChoice] = useState(false);

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

        {/* Center — Verify / Scan → choice: Entry o Exit */}
        <button
          onClick={() => setShowChoice(true)}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center shadow-lg"
        >
          <ScanLine size={26} />
        </button>
      </div>

      {/* Choice modal: Verify Entry / Verify Exit */}
      {showChoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6"
             style={{ pointerEvents: 'auto', zIndex: 60 }}
             onClick={() => setShowChoice(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-ink mb-1">Verify Visitor</h3>
            <p className="text-ink/60 text-sm mb-5">Choose what you want to process.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowChoice(false); navigate('/guard-verify'); }}
                      className="rounded-2xl p-5 flex flex-col items-center gap-2 text-white active:scale-95 transition"
                      style={{ backgroundColor: '#0F6E6E' }}>
                <LogIn size={28} />
                <span className="text-sm font-bold">Verify Entry</span>
              </button>
              <button onClick={() => { setShowChoice(false); navigate('/guard-verify?mode=exit'); }}
                      className="rounded-2xl p-5 flex flex-col items-center gap-2 text-white active:scale-95 transition"
                      style={{ backgroundColor: '#112D31' }}>
                <LogOut size={28} />
                <span className="text-sm font-bold">Verify Exit</span>
              </button>
            </div>
            <button onClick={() => setShowChoice(false)}
                    className="mt-4 w-full py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(bar, document.body);
}
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Home, CalendarClock, History, User, Plus } from 'lucide-react';

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  const items = [
    { key: 'home', Icon: Home, label: 'Home', path: '/home' },
    { key: 'schedule', Icon: CalendarClock, label: 'Schedule', path: '/schedule' },
    { key: 'spacer' },
    { key: 'history', Icon: History, label: 'History', path: '/history' },
    { key: 'profile', Icon: User, label: 'Profile', path: '/profile' },
  ];

  // I-render sa document.body (portal) para hindi maapektuhan ng anumang
  // transformed na ancestor — tunay na naka-fixed sa ibaba, hindi lumulutang.
  const bar = (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ pointerEvents: 'none' }}>
      <div className="mx-auto w-full max-w-md relative" style={{ pointerEvents: 'auto' }}>
        <nav
          className="w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {items.map((it, i) =>
            it.key === 'spacer' ? (
              <span key={i} className="w-16 shrink-0" />
            ) : (
              <button
                key={it.key}
                onClick={() => navigate(it.path)}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full shrink-0"
              >
                <it.Icon size={22} className={`text-ink ${active === it.key ? '' : 'opacity-40'}`} />
                <span className={`text-[10px] font-semibold leading-none ${active === it.key ? 'text-ink' : 'text-ink/40'}`}>
                  {it.label}
                </span>
              </button>
            )
          )}
        </nav>

        {/* Center floating + button */}
        <button
          onClick={() => navigate('/pre-register')}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-ink text-white shadow-lg flex items-center justify-center"
        >
          <Plus size={28} />
        </button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
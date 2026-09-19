import { useNavigate } from 'react-router-dom';
import { Home, CalendarClock, History, User, Plus } from 'lucide-react';

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  const items = [
    { key: 'home', Icon: Home, label: 'Home', path: '/home' },
    { key: 'schedule', Icon: CalendarClock, label: '', path: '/schedule' },
    { key: 'spacer' },
    { key: 'history', Icon: History, label: '', path: '/history' },
    { key: 'profile', Icon: User, label: '', path: '/profile' },
  ];

  return (
    <>
      {/* Center floating + button */}
      <button
        onClick={() => navigate('/pre-register')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-ink text-white shadow-lg flex items-center justify-center z-20 max-w-md"
      >
        <Plus size={30} />
      </button>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-10">
        <div className="flex justify-around items-center py-3">
          {items.map((it, i) =>
            it.key === 'spacer' ? (
              <span key={i} className="w-16" />
            ) : (
              <button
                key={it.key}
                onClick={() => navigate(it.path)}
                className="flex flex-col items-center"
              >
                <it.Icon size={24} className={`text-ink ${active === it.key ? '' : 'opacity-50'}`} />
                {active === it.key && it.label && (
                  <span className="text-xs font-semibold text-ink mt-0.5 border-b-2 border-ink">{it.label}</span>
                )}
              </button>
            )
          )}
        </div>
      </nav>
    </>
  );
}
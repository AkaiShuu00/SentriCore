import { useNavigate } from 'react-router-dom';

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  const items = [
    { key: 'home', icon: '🏠', label: 'Home', path: '/home' },
    { key: 'schedule', icon: '📅', label: '', path: '/schedule' },
    { key: 'spacer' },
    { key: 'history', icon: '📋', label: '', path: '/history' },
    { key: 'profile', icon: '👤', label: '', path: '/profile' },
  ];

  return (
    <>
      {/* Center floating + button */}
      <button
        onClick={() => navigate('/pre-register')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-ink text-white text-3xl shadow-lg flex items-center justify-center z-20 max-w-md"
      >
        ⊕
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
                <span className={`text-2xl ${active === it.key ? '' : 'opacity-50'}`}>{it.icon}</span>
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
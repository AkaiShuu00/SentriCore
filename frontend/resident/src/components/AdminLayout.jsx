import { useNavigate, useLocation } from 'react-router-dom';

// Shared admin shell: dark sidebar (left) + top header + content area
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');

  const nav = [
    { key: 'dashboard', label: 'Dashboard',   icon: '▦', to: '/admin-dashboard' },
    { key: 'logs',      label: 'Visitor Logs', icon: '📋', to: '/admin-visitor-logs' },
    { key: 'resident',  label: 'Resident',    icon: '🏠', to: '/admin-residents' },
    { key: 'guards',    label: 'Guards',      icon: '🛡️', to: '/admin-guards' },
    { key: 'reports',   label: 'Reports',     icon: '📊', to: '/admin-reports' },
  ];

  const isActive = (to) => location.pathname === to;

  const logout = () => {
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/admin-signin');
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#EFEBDD' }}>
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-ink text-white flex flex-col py-8 px-4 min-h-screen"
             style={{ background: 'linear-gradient(180deg,#0E2A2E 0%,#123A3C 100%)' }}>
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.jpg" alt="SentriCore" className="w-12 h-12 object-contain rounded-full bg-white/10" />
          <p className="text-sm font-extrabold tracking-widest mt-2">SENTRICORE</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((n) => (
            <button key={n.key} onClick={() => navigate(n.to)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-left
                      ${isActive(n.to) ? 'bg-teal-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>
              <span className="text-base w-5 text-center">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <button onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/10 transition text-left mt-4">
          <span className="text-base w-5 text-center">⎋</span> Log out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm w-96 max-w-full">
            <span className="text-ink/40">🔍</span>
            <input placeholder="Search anything..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>

          <div className="flex items-center gap-3 bg-white rounded-full pl-4 pr-1 py-1 shadow-sm">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-ink">{user.name || 'Admin'}</p>
              <p className="text-[10px] text-ink/50">Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-teal-200 flex items-center justify-center text-lg">👤</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 pb-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
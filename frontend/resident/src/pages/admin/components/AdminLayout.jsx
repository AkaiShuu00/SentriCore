import { useNavigate, useLocation } from 'react-router-dom';

// Shared admin shell: dark sidebar (left) + top header + content area
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');

  const nav = [
    { key: 'dashboard', label: 'Dashboard',    icon: '🏠', to: '/admin-dashboard' },
    { key: 'logs',      label: 'Visitor Logs', icon: '📋', to: '/admin-visitor-logs' },
    { key: 'resident',  label: 'Resident',     icon: '👤', to: '/admin-residents' },
    { key: 'guards',    label: 'Guards',       icon: '🛡️', to: '/admin-guards' },
    { key: 'reports',   label: 'Reports',      icon: '📊', to: '/admin-reports' },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#EFEBDD' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-8 px-4 min-h-screen"
             style={{ backgroundColor: '#0E2A2E' }}>
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.jpg" alt="SentriCore" className="w-14 h-14 object-contain rounded-full bg-white/10" />
          <p className="text-sm font-extrabold tracking-widest mt-2 text-white">SENTRICORE</p>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          {nav.map((n) => {
            const active = isActive(n.to);
            return (
              <button key={n.key} onClick={() => navigate(n.to)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-bold transition text-left shadow-sm"
                      style={active
                        ? { background: 'linear-gradient(135deg,#1E7E7E,#3FA89A)', color: '#fff' }
                        : { backgroundColor: '#fff', color: '#0E2A2E' }}>
                <span className="text-base w-5 text-center">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>
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

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-ink">{user.name || 'Madeline Perez'}</p>
              <p className="text-[10px] text-ink/50">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-white"
                 style={{ background: 'linear-gradient(135deg,#1E7E7E,#3FA89A)' }}>👤</div>
            <button onClick={() => {
                      localStorage.removeItem('sentricore_token');
                      localStorage.removeItem('sentricore_user');
                      navigate('/admin-signin');
                    }}
                    className="text-ink/50 text-sm ml-1" title="Log out">⌄</button>
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
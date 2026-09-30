import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, User, Shield, BarChart3, Search, ChevronDown, LogOut } from 'lucide-react';

// Shared admin shell: dark sidebar (left) + top header + content area
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [showLogout, setShowLogout] = useState(false);

  const doLogout = () => {
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/admin-signin');
  };

  const nav = [
    { key: 'dashboard', label: 'Dashboard',    Icon: LayoutDashboard, to: '/admin-dashboard' },
    { key: 'logs',      label: 'Visitor Logs', Icon: ClipboardList,   to: '/admin-visitor-logs' },
    { key: 'resident',  label: 'Resident',     Icon: User,            to: '/admin-residents' },
    { key: 'guards',    label: 'Guards',       Icon: Shield,          to: '/admin-guards' },
    { key: 'reports',   label: 'Reports',      Icon: BarChart3,       to: '/admin-reports' },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#EFEBDD' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-8 px-4 min-h-screen"
             style={{ backgroundColor: '#0E2A2E' }}>
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="SentriCore" className="w-14 h-14 object-contain" />
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
                <n.Icon size={18} className="shrink-0" />
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
            <Search size={18} className="text-ink/40" />
            <input placeholder="Search anything..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>

          <button onClick={() => setShowLogout(true)} className="flex items-center gap-3" title="Log out">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-ink">{user.name || 'Admin'}</p>
              <p className="text-[10px] text-ink/50">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                 style={{ background: 'linear-gradient(135deg,#1E7E7E,#3FA89A)' }}><User size={20} /></div>
            <ChevronDown size={18} className="text-ink/50" />
          </button>
        </header>

        {/* Log out confirmation */}
        {showLogout && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setShowLogout(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3"><LogOut size={26} className="text-red-600" /></div>
              <h3 className="text-xl font-extrabold text-ink mb-1">Log out?</h3>
              <p className="text-ink/60 text-sm mb-5">Are you sure you want to log out of your admin account?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogout(false)}
                        className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">Cancel</button>
                <button onClick={doLogout}
                        className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#C0392B' }}>Log Out</button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 px-8 pb-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
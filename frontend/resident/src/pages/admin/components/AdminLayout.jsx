import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, User, Shield, BarChart3, Search, ChevronDown, LogOut, X } from 'lucide-react';
import { getMyAdminProfile, updateMyAdminProfile } from '../../api';

// Shared admin shell: dark sidebar (left) + top header + content area
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('sentricore_user') || '{}'));
  const [showLogout, setShowLogout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Profile edit state
  const [form, setForm] = useState({ displayName: '', phoneNumber: '', email: '', currentPassword: '', newPassword: '' });
  const [pLoading, setPLoading] = useState(false);
  const [pErr, setPErr] = useState('');
  const [pMsg, setPMsg] = useState('');

  const doLogout = () => {
    sessionStorage.removeItem('sentricore_token');
    sessionStorage.removeItem('sentricore_user');
    navigate('/admin-signin');
  };

  const openProfile = () => {
    setPErr(''); setPMsg('');
    setShowProfile(true);
    getMyAdminProfile()
      .then((res) => setForm({
        displayName: res.data.displayName || '',
        phoneNumber: res.data.phoneNumber || '',
        email: res.data.email || '',
        currentPassword: '', newPassword: '',
      }))
      .catch(() => {});
  };

  const saveProfile = async () => {
    setPErr(''); setPMsg('');
    if (!form.displayName.trim()) { setPErr('Display name is required.'); return; }
    if (form.newPassword && !form.currentPassword) { setPErr('Enter your current password to set a new one.'); return; }
    setPLoading(true);
    try {
      await updateMyAdminProfile(form);
      // I-reflect agad ang bagong pangalan sa dashboard header
      const updated = { ...user, name: form.displayName.trim() };
      sessionStorage.setItem('sentricore_user', JSON.stringify(updated));
      setUser(updated);
      setPMsg('Profile updated.');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (e) {
      setPErr(e.response?.data?.message || 'Failed to update profile.');
    } finally { setPLoading(false); }
  };

  const nav = [
    { key: 'dashboard', label: 'Dashboard',    Icon: LayoutDashboard, to: '/admin-dashboard' },
    { key: 'logs',      label: 'Visitor Logs', Icon: ClipboardList,   to: '/admin-visitor-logs' },
    { key: 'resident',  label: 'Resident',     Icon: User,            to: '/admin-residents' },
    { key: 'guards',    label: 'Guards',       Icon: Shield,          to: '/admin-guards' },
    { key: 'reports',   label: 'Reports',      Icon: BarChart3,       to: '/admin-reports' },
  ];

  const isActive = (to) => location.pathname === to;

  const field = (label, key, type = 'text', ph = '') => (
    <div>
      <label className="block text-xs font-bold text-ink mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
             placeholder={ph}
             className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#EFEBDD' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-8 px-4 min-h-screen" style={{ backgroundColor: '#0E2A2E' }}>
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
        <header className="flex items-center justify-end px-8 py-5">
          {/* Account → open profile editor */}
          <button onClick={openProfile} className="flex items-center gap-3" title="Account settings">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-ink">{user.name || 'Admin'}</p>
              <p className="text-[10px] text-ink/50">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                 style={{ background: 'linear-gradient(135deg,#1E7E7E,#3FA89A)' }}><User size={20} /></div>
            <ChevronDown size={18} className="text-ink/50" />
          </button>
        </header>

        {/* Admin Profile modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowProfile(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
              <h2 className="text-xl font-extrabold text-ink mb-1">Admin Profile</h2>
              <p className="text-xs text-ink/60 mb-4">Update your details. The phone number here is what guards see as the HOA contact.</p>

              {pErr && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{pErr}</p>}
              {pMsg && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 mb-3">{pMsg}</p>}

              <div className="space-y-3">
                {field('Display Name (shown on dashboard & to guards)', 'displayName', 'text', 'HOA Admin')}
                {field('Phone Number (HOA contact)', 'phoneNumber', 'text', '0912 345 6789')}
                {field('Email', 'email', 'email', 'admin@email.com')}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-ink/60 mb-2">Change Password (optional)</p>
                  {field('Current Password', 'currentPassword', 'password', '••••••••')}
                  <div className="h-3" />
                  {field('New Password', 'newPassword', 'password', 'at least 6 characters')}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowProfile(false)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Close</button>
                <button onClick={saveProfile} disabled={pLoading}
                        className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-60" style={{ backgroundColor: '#0F6E6E' }}>
                  {pLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              <button onClick={() => { setShowProfile(false); setShowLogout(true); }}
                      className="w-full mt-3 py-2.5 rounded-full border border-red-300 text-red-600 font-bold text-sm bg-red-50 inline-flex items-center justify-center gap-2">
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        )}

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
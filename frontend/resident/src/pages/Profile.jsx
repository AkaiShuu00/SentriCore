import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getMyProfile } from '../api';

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then((res) => setProfile(res.data || null))
      .catch(() => setProfile(null));
  }, []);

  function handleLogout() {
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/signin');
  }

  // Kunin mula profile (DB) na may fallback sa token — robust sa field names
  const name    = profile?.full_name || profile?.name || user.name || 'Resident';
  const email   = profile?.email || user.email || '—';
  const address = profile?.unit_address || profile?.address || '—';
  const contact = profile?.contact_number || profile?.contact || profile?.phone || '—';

  const personalInfo = [
    { icon: '🏠', bg: 'bg-teal-100', main: address, sub: 'Unit address' },
    { icon: '📞', bg: 'bg-yellow-100', main: contact, sub: 'Contact number' },
    { icon: '✉️', bg: 'bg-red-100', main: email, sub: 'Email address' },
  ];

  const settings = [
    { icon: '🛡️', label: 'Password and Security', action: () => navigate('/password-security') },
    { icon: '🔔', label: 'Notifications', action: () => navigate('/notification-settings') },
    { icon: '🚫', label: 'Blocklisted', action: () => navigate('/blocklist') },
    { icon: '❓', label: 'Help Center', action: () => navigate('/help-center') },
    { icon: '💬', label: 'FAQs', action: () => navigate('/faqs') },
    { icon: '🧾', label: 'Terms and Permissions', action: () => navigate('/terms') },
  ];

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">
          ‹
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Profile</h1>
          <p className="text-white/70 text-sm">View and manage your profile details below</p>
        </div>
      </header>

      <div className="px-4">
        {/* Profile card */}
        <div className="rounded-3xl shadow-lg mt-5 overflow-hidden bg-white">
          <div className="h-24" style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }} />
          <div className="px-5 pb-5 -mt-12">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-yellow-300 border-4 border-white flex items-center justify-center text-4xl shrink-0">
                👩
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-14">{name.toUpperCase()}</h2>
            </div>
            <p className="text-ink/70 mt-2">{email}</p>
          </div>
        </div>

        {/* Personal Information */}
        <h3 className="text-xl font-extrabold text-ink mt-6 mb-3">Personal Information</h3>
        <div className="bg-white rounded-3xl p-5 shadow">
          {personalInfo.map((p, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 py-3">
                <div className={`w-12 h-12 rounded-2xl ${p.bg} flex items-center justify-center text-xl shrink-0`}>{p.icon}</div>
                <div>
                  <p className="font-bold text-ink">{p.main}</p>
                  <p className="text-sm text-ink/60">{p.sub}</p>
                </div>
              </div>
              {i < personalInfo.length - 1 && <div className="border-b border-gray-200" />}
            </div>
          ))}
        </div>

        {/* General Settings */}
        <h3 className="text-xl font-extrabold text-ink mt-6 mb-3">General Settings</h3>
        <div className="bg-white rounded-3xl p-2 shadow">
          {settings.map((s, i) => (
            <div key={i}>
              <button onClick={s.action} className="w-full flex items-center gap-4 px-3 py-4">
                <span className="text-xl w-8 text-center shrink-0">{s.icon}</span>
                <span className="flex-1 text-left font-medium text-ink">{s.label}</span>
                <span className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-ink">›</span>
              </button>
              {i < settings.length - 1 && <div className="border-b border-gray-200 mx-3" />}
            </div>
          ))}
        </div>

        {/* Log out */}
        <button onClick={handleLogout}
                className="w-full text-white font-extrabold text-xl py-4 rounded-full mt-6 shadow-lg active:scale-95 transition"
                style={{ backgroundColor: '#0F6E6E' }}>
          LOG OUT
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
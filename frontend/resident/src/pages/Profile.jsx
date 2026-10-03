import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getMyProfile } from '../api';
import { useT, LangToggle } from '../i18n';
import { Home as HomeIcon, Phone, ShieldCheck, Ban, HelpCircle, MessageSquare, FileText, User, Pencil, X, LogOut } from 'lucide-react';

// Optional profile avatar — naka-save sa localStorage (cosmetic lang).
// Ang mga larawan ay nasa public/avatars/  → /avatars/male.png at /avatars/female.png
const AVATARS = {
  male: '/avatars/male.png',
  female: '/avatars/female.png',
};

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useT();
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  const [profile, setProfile] = useState(null);
  const [avatar, setAvatar] = useState('default');
  const [showAvatar, setShowAvatar] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((res) => setProfile(res.data || null))
      .catch(() => setProfile(null));
    try {
      const saved = sessionStorage.getItem('sentricore_avatar');
      if (saved) setAvatar(saved);
    } catch { /* ignore */ }
  }, []);

  const chooseAvatar = (choice) => {
    setAvatar(choice);
    try { sessionStorage.setItem('sentricore_avatar', choice); } catch { /* ignore */ }
    setShowAvatar(false);
  };

  function handleLogout() {
    sessionStorage.removeItem('sentricore_token');
    sessionStorage.removeItem('sentricore_user');
    navigate('/signin');
  }

  const name    = profile?.full_name || profile?.name || user.name || 'Resident';
  const address = profile?.unit_address || profile?.address || '—';
  const contact = profile?.phone_number || profile?.contact_number || profile?.contact || profile?.phone || user.contact || '—';
  const avatarSrc = AVATARS[avatar] || null;

  const personalInfo = [
    { Icon: HomeIcon, bg: 'bg-teal-100', main: address, sub: t('Unit address', 'Address ng unit') },
    { Icon: Phone, bg: 'bg-yellow-100', main: contact, sub: t('Contact number', 'Numero ng kontak') },
  ];

  const settings = [
    { Icon: ShieldCheck, label: t('Password and Security', 'Password at Seguridad'), action: () => navigate('/password-security') },
    { Icon: Ban, label: t('Blocklisted', 'Blocklist'), action: () => navigate('/blocklist') },
    { Icon: HelpCircle, label: t('Help Center', 'Sentro ng Tulong'), action: () => navigate('/help-center') },
    { Icon: MessageSquare, label: t('FAQs', 'Mga FAQ'), action: () => navigate('/faqs') },
    { Icon: FileText, label: t('Terms and Permissions', 'Mga Tuntunin at Pahintulot'), action: () => navigate('/terms') },
  ];

  const AvatarInner = ({ size }) => (
    avatarSrc
      ? <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
      : <User size={size} className="text-ink" />
  );

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">
          ‹
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-white">{t('My Profile', 'Aking Profile')}</h1>
          <p className="text-white/70 text-sm">{t('View and manage your profile details below', 'Tingnan at pamahalaan ang detalye ng iyong profile')}</p>
        </div>
        <LangToggle />
      </header>

      <div className="px-4">
        {/* Profile card */}
        <div className="rounded-3xl shadow-lg mt-5 overflow-hidden bg-white">
          <div className="h-24" style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }} />
          <div className="px-5 pb-5 -mt-12">
            <div className="flex items-end gap-4">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full bg-yellow-300 border-4 border-white flex items-center justify-center overflow-hidden">
                  <AvatarInner size={44} />
                </div>
                {/* Edit avatar (optional) */}
                <button onClick={() => setShowAvatar(true)} aria-label={t('Change profile picture', 'Palitan ang larawan')}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center border-2 border-white shadow">
                  <Pencil size={14} />
                </button>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-14 break-words">{name.toUpperCase()}</h2>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <h3 className="text-xl font-extrabold text-ink mt-6 mb-3">{t('Personal Information', 'Personal na Impormasyon')}</h3>
        <div className="bg-white rounded-3xl p-5 shadow">
          {personalInfo.map((p, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 py-3">
                <div className={`w-12 h-12 rounded-2xl ${p.bg} flex items-center justify-center shrink-0`}><p.Icon size={20} className="text-ink" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-ink break-words">{p.main}</p>
                  <p className="text-sm text-ink/60">{p.sub}</p>
                </div>
              </div>
              {i < personalInfo.length - 1 && <div className="border-b border-gray-200" />}
            </div>
          ))}
        </div>

        {/* General Settings */}
        <h3 className="text-xl font-extrabold text-ink mt-6 mb-3">{t('General Settings', 'Pangkalahatang Setting')}</h3>
        <div className="bg-white rounded-3xl p-2 shadow">
          {settings.map((s, i) => (
            <div key={i}>
              <button onClick={s.action} className="w-full flex items-center gap-4 px-3 py-4">
                <span className="w-8 flex justify-center shrink-0"><s.Icon size={20} className="text-ink" /></span>
                <span className="flex-1 text-left font-medium text-ink">{s.label}</span>
                <span className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-ink">›</span>
              </button>
              {i < settings.length - 1 && <div className="border-b border-gray-200 mx-3" />}
            </div>
          ))}
        </div>

        {/* Log out */}
        <button onClick={() => setShowLogout(true)}
                className="w-full text-white font-extrabold text-xl py-4 rounded-full mt-6 shadow-lg active:scale-95 transition"
                style={{ backgroundColor: '#0F6E6E' }}>
          {t('LOG OUT', 'MAG-LOG OUT')}
        </button>
      </div>

      {/* Log out confirmation */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3"><LogOut size={26} className="text-red-600" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-1">{t('Log out?', 'Mag-log out?')}</h3>
            <p className="text-ink/60 text-sm mb-5">{t('Are you sure you want to log out of your account?', 'Sigurado ka bang gusto mong mag-log out sa iyong account?')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">{t('Cancel', 'Kanselahin')}</button>
              <button onClick={handleLogout}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#C0392B' }}>{t('Log Out', 'Mag-log Out')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker modal (optional) */}
      {showAvatar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setShowAvatar(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAvatar(false)} className="absolute" style={{ display: 'none' }} />
            <h3 className="text-lg font-extrabold text-ink mb-1">{t('Choose profile picture', 'Pumili ng larawan')}</h3>
            <p className="text-ink/60 text-xs mb-5">{t('Optional — pick an icon that fits you.', 'Opsyonal — pumili ng icon na bagay sa iyo.')}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'male', label: t('Male', 'Lalaki') },
                { key: 'female', label: t('Female', 'Babae') },
                { key: 'default', label: t('Default', 'Default') },
              ].map((opt) => (
                <button key={opt.key} onClick={() => chooseAvatar(opt.key)}
                        className={`rounded-2xl p-3 border-2 flex flex-col items-center gap-2 ${avatar === opt.key ? 'border-teal-600' : 'border-gray-200'}`}>
                  <div className="w-14 h-14 rounded-full bg-yellow-300 flex items-center justify-center overflow-hidden">
                    {opt.key === 'default'
                      ? <User size={28} className="text-ink" />
                      : <img src={AVATARS[opt.key]} alt={opt.label} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-[11px] font-bold text-ink">{opt.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAvatar(false)}
                    className="mt-5 w-full py-3 rounded-full text-sm font-bold text-ink border border-gray-300">
              {t('CANCEL', 'KANSELAHIN')}
            </button>
          </div>
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  );
}
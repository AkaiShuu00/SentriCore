import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function PasswordSecurity() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    if (!current || !next || !confirm) { setErr('Please fill in all fields.'); return; }
    if (next.length < 6) { setErr('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setErr('New passwords do not match.'); return; }
    if (next === current) { setErr('New password must be different from the current one.'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      navigate('/password-changed');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  const field = (label, value, setter, placeholder) => (
    <div className="mb-4">
      <label className="block text-sm font-bold text-ink mb-2">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => setter(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 pr-12 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30" />
        <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Password &amp; Security</h1>
          <p className="text-white/70 text-sm">Change your account password</p>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-2">
            <ShieldCheck size={30} className="text-teal-700" />
          </div>
          <p className="text-ink/60 text-sm text-center">Enter your current password, then set a new one.</p>
        </div>

        {err && <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{err}</p>}

        <div className="bg-white rounded-3xl p-5 shadow">
          {field('Current Password', current, setCurrent, 'Enter current password')}
          {field('New Password', next, setNext, 'At least 6 characters')}
          {field('Confirm New Password', confirm, setConfirm, 'Re-type new password')}

          <button onClick={submit} disabled={loading}
                  className="w-full text-white font-bold text-lg py-4 rounded-full mt-2 active:scale-95 transition disabled:opacity-60"
                  style={{ backgroundColor: '#0F6E6E' }}>
            {loading ? 'SAVING...' : 'CHANGE PASSWORD'}
          </button>
        </div>

        <p className="text-center text-ink/60 text-sm mt-5">
          Forgot your current password?{' '}
          <button onClick={() => navigate('/forgot-password')} className="font-bold underline text-ink">Reset via email</button>
        </p>
      </div>
    </div>
  );
}
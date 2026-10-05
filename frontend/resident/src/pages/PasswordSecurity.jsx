import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getMyProfile, forgotPassword, resetPassword } from '../api';
import { ShieldCheck, Eye, EyeOff, Mail, X } from 'lucide-react';

// ── Password strength (weak → strong) ──
function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4); // 0..4
}
const STRENGTH = [
  { label: '', color: '#e5e7eb' },
  { label: 'Weak', color: '#E05A4E' },
  { label: 'Fair', color: '#E0A83E' },
  { label: 'Good', color: '#3FA89A' },
  { label: 'Strong', color: '#1E7E7E' },
];

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  const shown = name.slice(0, Math.min(2, name.length));
  return `${shown}${'*'.repeat(Math.max(name.length - shown.length, 3))}@${domain}`;
}

// Reusable password input na may eye toggle
function PwField({ label, value, setter, placeholder, meter }) {
  const [show, setShow] = useState(false);
  const sc = meter ? scorePassword(value) : 0;
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-ink mb-2">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => setter(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 pr-12 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30" />
        <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {meter && value && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: i <= sc ? STRENGTH[sc].color : '#e5e7eb' }} />
            ))}
          </div>
          <span className="text-xs font-semibold" style={{ color: STRENGTH[sc].color }}>{STRENGTH[sc].label}</span>
        </div>
      )}
    </div>
  );
}

export default function PasswordSecurity() {
  const navigate = useNavigate();

  // ── Standard change-password (alam ang current) ──
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Email used for reset-via-email ──
  const [email, setEmail] = useState('');
  useEffect(() => {
    getMyProfile().then((res) => setEmail(res.data?.email || '')).catch(() => {});
  }, []);

  const submit = async () => {
    setErr(''); setMsg('');
    if (!current || !next || !confirm) { setErr('Please fill in all fields.'); return; }
    if (next.length < 6) { setErr('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setErr('New passwords do not match.'); return; }
    if (next === current) { setErr('New password must be different from the current one.'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setMsg('Password changed successfully.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  // ── Reset-via-email modal (step 1→2→3 → auto-logout) ──
  const [resetOpen, setResetOpen] = useState(false);

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
        {msg && <p className="text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 text-sm mb-4 text-center">{msg}</p>}

        {/* STANDARD change password */}
        <div className="bg-white rounded-3xl p-5 shadow">
          <PwField label="Current Password" value={current} setter={setCurrent} placeholder="Enter current password" />
          <PwField label="New Password" value={next} setter={setNext} placeholder="At least 6 characters" meter />
          <PwField label="Confirm New Password" value={confirm} setter={setConfirm} placeholder="Re-type new password" />

          <button onClick={submit} disabled={loading}
                  className="w-full text-white font-semibold text-lg py-4 rounded-full mt-2 active:scale-95 transition disabled:opacity-60 whitespace-nowrap"
                  style={{ backgroundColor: '#0F6E6E' }}>
            {loading ? 'Saving…' : 'Change Password'}
          </button>
        </div>

        {/* RESET VIA EMAIL — para sa nakalimutang current password */}
        <div className="bg-white rounded-3xl p-5 shadow mt-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center" style={{ backgroundColor: '#F5F2E9' }}>
              <Mail size={18} className="text-teal-700" />
            </div>
            <div>
              <p className="font-semibold text-ink">Forgot your current password?</p>
              <p className="text-xs text-ink/60">Reset it using a code sent to your email.</p>
            </div>
          </div>
          <button onClick={() => setResetOpen(true)}
                  className="w-full mt-2 py-3 rounded-full border border-teal-600 text-teal-700 font-semibold text-sm whitespace-nowrap">
            Reset via Email
          </button>
        </div>
      </div>

      {resetOpen && (
        <ResetModal email={email} onClose={() => setResetOpen(false)}
                    onDone={() => {
                      sessionStorage.removeItem('sentricore_token');
                      sessionStorage.removeItem('sentricore_user');
                      navigate('/signin');
                    }} />
      )}
    </div>
  );
}

// ── Pop-up: step 1 (send code) → 2 (verify code) → 3 (new password) → auto-logout ──
function ResetModal({ email, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [np, setNp] = useState('');
  const [cp, setCp] = useState('');
  const [busy, setBusy] = useState(false);
  const [e, setE] = useState('');

  const sendCode = async () => {
    setE(''); setBusy(true);
    try {
      await forgotPassword(email);
      setStep(2);
    } catch (ex) {
      setE(ex.response?.data?.message || 'Failed to send code. Try again.');
    } finally { setBusy(false); }
  };

  const verifyCode = () => {
    setE('');
    if (!code.trim() || code.trim().length < 4) { setE('Enter the code from your email.'); return; }
    setStep(3);
  };

  const savePassword = async () => {
    setE('');
    if (np.length < 6) { setE('New password must be at least 6 characters.'); return; }
    if (np !== cp) { setE('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await resetPassword({ email, code: code.trim(), otp: code.trim(), newPassword: np });
      setStep(4);
      setTimeout(onDone, 1800);
    } catch (ex) {
      setE(ex.response?.data?.message || 'Reset failed. Check your code and try again.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={step === 4 ? undefined : onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative" onClick={(ev) => ev.stopPropagation()}>
        {step !== 4 && (
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
        )}

        {e && <p className="text-red-700 bg-red-100 rounded-xl px-3 py-2 text-sm mb-3 text-center">{e}</p>}

        {/* STEP 1 — masked email + Send Code */}
        {step === 1 && (
          <>
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3"><Mail size={26} className="text-teal-700" /></div>
            <h3 className="text-xl font-extrabold text-ink text-center mb-1">Reset Password</h3>
            <p className="text-sm text-ink/60 text-center mb-5">
              We'll send a verification code to<br /><span className="font-semibold text-ink">{maskEmail(email) || 'your email'}</span>
            </p>
            <button onClick={sendCode} disabled={busy || !email}
                    className="w-full text-white font-semibold py-3 rounded-full disabled:opacity-60 whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              {busy ? 'Sending…' : 'Send Code'}
            </button>
          </>
        )}

        {/* STEP 2 — enter code */}
        {step === 2 && (
          <>
            <h3 className="text-xl font-extrabold text-ink text-center mb-1">Enter Code</h3>
            <p className="text-sm text-ink/60 text-center mb-5">Type the code we sent to {maskEmail(email)}.</p>
            <input value={code} onChange={(ev) => setCode(ev.target.value)} placeholder="6-digit code"
                   className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-center tracking-widest text-lg text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-4" />
            <button onClick={verifyCode}
                    className="w-full text-white font-semibold py-3 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              Verify Code
            </button>
            <button onClick={() => { setE(''); setStep(1); }} className="w-full text-ink/60 text-sm mt-3">Didn't get it? Resend</button>
          </>
        )}

        {/* STEP 3 — new + confirm password */}
        {step === 3 && (
          <>
            <h3 className="text-xl font-extrabold text-ink text-center mb-4">Set New Password</h3>
            <PwField label="New Password" value={np} setter={setNp} placeholder="At least 6 characters" meter />
            <PwField label="Confirm Password" value={cp} setter={setCp} placeholder="Re-type new password" />
            <button onClick={savePassword} disabled={busy}
                    className="w-full text-white font-semibold py-3 rounded-full disabled:opacity-60 whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              {busy ? 'Saving…' : 'Reset Password'}
            </button>
          </>
        )}

        {/* STEP 4 — success → auto logout */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3"><ShieldCheck size={28} className="text-teal-700" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-1">Password Reset</h3>
            <p className="text-sm text-ink/60">Signing you out for security…</p>
          </div>
        )}
      </div>
    </div>
  );
}
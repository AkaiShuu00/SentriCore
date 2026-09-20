import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, KeyRound } from 'lucide-react';

const API = '/api';
const H = { headers: { 'ngrok-skip-browser-warning': 'true' } };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);           // 1=email, 2=code+new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setErr(''); setMsg('');
    if (!email.trim()) { setErr('Please enter your registered email.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot`, { email: email.trim() }, H);
      setMsg('If the email is registered, a verification code has been sent. Check your inbox.');
      setStep(2);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to send code. Please try again.');
    } finally { setLoading(false); }
  };

  const reset = async () => {
    setErr(''); setMsg('');
    if (!code.trim()) { setErr('Enter the verification code.'); return; }
    if (pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset`, { email: email.trim(), code: code.trim(), newPassword: pw }, H);
      navigate('/password-changed');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-ink flex justify-center">
      <div className="bg-cream w-full sm:max-w-md min-h-screen relative px-8">
        <div className="flex flex-col items-center pt-12 pb-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-3">
            {step === 1 ? <Mail size={30} className="text-teal-700" /> : <KeyRound size={30} className="text-teal-700" />}
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Forgot Password</h1>
          <p className="text-ink/60 text-sm text-center mt-1">
            {step === 1 ? 'Enter your registered email to get a verification code.' : 'Enter the code we sent and your new password.'}
          </p>
        </div>

        {err && <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-3 text-center">{err}</p>}
        {msg && <p className="text-teal-800 bg-teal-100 rounded-xl px-4 py-2 text-sm mb-3 text-center">{msg}</p>}

        {step === 1 ? (
          <>
            <label className="block text-sm font-bold text-ink mb-2 mt-2">Registered Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                   placeholder="resident@gmail.com"
                   className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-5" />
            <button onClick={sendCode} disabled={loading}
                    className="w-full bg-ink text-white font-bold text-lg py-4 rounded-full active:scale-95 transition disabled:opacity-60">
              {loading ? 'SENDING...' : 'SEND VERIFICATION CODE'}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm font-bold text-ink mb-2">Verification Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code"
                   className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-4 tracking-widest text-center" />
            <label className="block text-sm font-bold text-ink mb-2">New Password</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
                   className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-4" />
            <label className="block text-sm font-bold text-ink mb-2">Confirm New Password</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••"
                   className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-5" />
            <button onClick={reset} disabled={loading}
                    className="w-full bg-ink text-white font-bold text-lg py-4 rounded-full active:scale-95 transition disabled:opacity-60">
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
            </button>
            <button onClick={() => { setStep(1); setErr(''); setMsg(''); }}
                    className="w-full text-ink/60 text-sm mt-3 underline">Use a different email</button>
          </>
        )}

        <p className="text-center text-ink mt-6">
          <button onClick={() => navigate('/signin')} className="font-bold underline">Back to Sign In</button>
        </p>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PasswordSecurity() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');
  const [step, setStep] = useState(1); // 1=email, 2=new password, 3=success
  const [email, setEmail] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  function handleProceed() {
    setError('');
    if (!email) { setError('Please enter your email address.'); return; }
    setStep(2);
  }

  function handleConfirm() {
    setError('');
    if (!oldPw || !newPw || !confirmPw) { setError('Please fill in all fields.'); return; }
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    setStep(3);
  }

  function handleSignIn() {
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/signin');
  }

  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto relative">
      {/* Dark header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => step === 1 ? navigate('/profile') : setStep(step - 1)}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">
          ‹
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Password and Security</h1>
          <p className="text-white/70 text-sm">Verify and update your password</p>
        </div>
      </header>

      <div className="flex items-center justify-center px-6 py-16">
        {/* Step 1 — Change Password (email) */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-lg w-full p-8">
            <button onClick={() => navigate('/profile')}
                    className="w-12 h-12 rounded-full bg-cream shadow flex items-center justify-center text-2xl text-ink mb-6">‹</button>
            <h2 className="text-4xl font-extrabold text-ink mb-2">Change Password</h2>
            <p className="text-ink/70 mb-8">Enter your email address below to proceed</p>
            <label className="block text-lg font-bold text-ink mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="you@gmail.com"
                   className="w-full border border-ink/30 rounded-2xl px-5 py-4 text-ink mb-6 focus:outline-none focus:ring-2 focus:ring-ink/30" />
            {error && <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{error}</p>}
            <button onClick={handleProceed}
                    className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full tracking-wide active:scale-95 transition">
              PROCEED
            </button>
          </div>
        )}

        {/* Step 2 — Create new password */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-lg w-full p-8">
            <button onClick={() => setStep(1)}
                    className="w-12 h-12 rounded-full bg-cream shadow flex items-center justify-center text-2xl text-ink mb-6">‹</button>
            <h2 className="text-4xl font-extrabold text-ink mb-2">Create new password</h2>
            <p className="text-ink/70 mb-8">Enter your current and new password below</p>
            {[
              { label: 'Old Password', val: oldPw, set: setOldPw },
              { label: 'New Password', val: newPw, set: setNewPw },
              { label: 'Confirm Password', val: confirmPw, set: setConfirmPw },
            ].map((f) => (
              <div key={f.label} className="mb-5">
                <label className="block text-lg font-bold text-ink mb-2">{f.label}</label>
                <input type="password" value={f.val} onChange={(e) => f.set(e.target.value)}
                       className="w-full border border-ink/30 rounded-2xl px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-ink/30" />
              </div>
            ))}
            {error && <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{error}</p>}
            <button onClick={handleConfirm}
                    className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full mt-4 tracking-wide active:scale-95 transition">
              CONFIRM
            </button>
          </div>
        )}

        {/* Step 3 — Password changed */}
        {step === 3 && (
          <div className="bg-white rounded-3xl shadow-lg w-full p-10 text-center">
            <div className="text-7xl mb-6">🏅</div>
            <h2 className="text-3xl font-extrabold text-ink mb-4">Password changed!</h2>
            <p className="text-ink/70 mb-8">
              You have successfully created a new password. Kindly click the button below to sign in again.
            </p>
            <button onClick={handleSignIn}
                    className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full tracking-wide active:scale-95 transition">
              SIGN IN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
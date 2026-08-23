import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreatePassword() {
  const navigate = useNavigate();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    setError('');
    if (!oldPw || !newPw || !confirmPw) { setError('Please fill in all fields.'); return; }
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    navigate('/password-changed');
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">
        <button onClick={() => navigate('/signin')}
                className="w-12 h-12 rounded-full bg-cream shadow flex items-center justify-center text-2xl text-ink mb-6">
          ‹
        </button>

        <h1 className="text-4xl font-extrabold text-ink mb-2">Create new password</h1>
        <p className="text-ink/70 mb-8">Enter your current and new password below</p>

        {[
          { label: 'Old Password', val: oldPw, set: setOldPw },
          { label: 'New Password', val: newPw, set: setNewPw },
          { label: 'Confirm Password', val: confirmPw, set: setConfirmPw },
        ].map((f) => (
          <div key={f.label} className="mb-5">
            <label className="block text-lg font-bold text-ink mb-2">{f.label}</label>
            <input
              type="password"
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              className="w-full border border-ink/30 rounded-2xl px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </div>
        ))}

        {error && <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{error}</p>}

        <button
          onClick={handleConfirm}
          className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full mt-4 active:scale-95 transition tracking-wide"
        >
          CONFIRM
        </button>
      </div>
    </div>
  );
}
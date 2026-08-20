import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3000/api';

export default function SignIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNoAccount, setShowNoAccount] = useState(false);

  async function handleSignIn() {
    setError('');
    if (!username || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username,
        password,
        role: 'Resident',
      });
      // Save session
      localStorage.setItem('sentricore_token', res.data.token);
      localStorage.setItem('sentricore_user', JSON.stringify(res.data.user));
      navigate('/home'); // dashboard (gagawin natin next)
    } catch (err) {
      setError(err.response?.data?.message || 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex justify-center">
      <div className="bg-cream w-full sm:max-w-md min-h-screen relative overflow-hidden">
        {/* Curved top with logo */}
        <div className="flex flex-col items-center pt-10 pb-6">
          <img src="/logo.jpg" alt="SentriCore" className="w-24 h-24 object-contain" />
          <h1 className="text-2xl font-extrabold text-ink tracking-wide"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.15)' }}>
            SENTRICORE
          </h1>
        </div>

        <div className="px-8">
          <h2 className="text-4xl font-extrabold text-ink text-center my-8">SIGN IN</h2>

          {/* Username (design says email, but backend uses username) */}
          <label className="block text-lg font-bold text-ink mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="resident1"
            className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-5"
          />

          <label className="block text-lg font-bold text-ink mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="••••••••"
            className="w-full bg-black/5 border border-ink/20 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-2"
          />

          <div className="text-right mb-4">
            <button onClick={() => navigate('/forgot-password')}
                    className="text-ink underline text-sm">
              Forgot your password?
            </button>
          </div>

          {error && (
            <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{error}</p>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full mt-6 active:scale-95 transition disabled:opacity-60"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <p className="text-center text-ink mt-5 mb-10">
            Don't have an account?{' '}
            <button onClick={() => setShowNoAccount(true)} className="font-bold underline">
              SIGN UP
            </button>
          </p>
        </div>

        {/* "No account" modal */}
        {showNoAccount && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-2xl font-extrabold text-ink mb-3">Don't have an account?</h3>
              <p className="text-ink/70 mb-6">
                Please contact your HOA administrator to request for initial login credentials.
              </p>
              <button
                onClick={() => setShowNoAccount(false)}
                className="w-full bg-ink text-white font-bold py-4 rounded-full active:scale-95 transition"
              >
                BACK TO SIGN IN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
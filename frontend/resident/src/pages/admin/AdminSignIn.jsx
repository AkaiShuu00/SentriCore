import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3000/api';

export default function AdminSignIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError('');
    if (!username || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      const user = res.data.user;
      localStorage.setItem('sentricore_token', res.data.token);
      localStorage.setItem('sentricore_user', JSON.stringify(user));

      if ((user.role || '').toLowerCase() === 'admin') {
        navigate('/admin-dashboard');
      } else {
        setError('This account is not an administrator.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#EFEBDD' }}>
      <div className="bg-cream w-full max-w-xl rounded-3xl shadow-xl px-16 py-14"
           style={{ backgroundColor: '#F5F2E9' }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="SentriCore" className="w-14 h-14 object-contain rounded-full" />
          <p className="text-sm font-bold text-ink tracking-widest mt-1">SENTRICORE</p>
          <h1 className="text-2xl font-extrabold text-ink mt-3">ADMIN SIGN IN</h1>
        </div>

        <label className="block text-sm font-bold text-ink mb-1">Email Address</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="admin@sentri.com"
          className="w-full bg-white border border-gray-300 rounded-full px-5 py-3 text-ink placeholder-ink/40 outline-none focus:ring-2 focus:ring-teal-600/30 mb-5"
        />

        <label className="block text-sm font-bold text-ink mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="••••••••"
          className="w-full bg-white border border-gray-300 rounded-full px-5 py-3 text-ink placeholder-ink/40 outline-none focus:ring-2 focus:ring-teal-600/30 mb-6"
        />

        {error && (
          <p className="text-red-700 bg-red-100 rounded-xl px-4 py-2 text-sm mb-4 text-center">{error}</p>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="bg-ink text-white font-bold px-16 py-3 rounded-full active:scale-95 transition disabled:opacity-60"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </div>
      </div>
    </div>
  );
}
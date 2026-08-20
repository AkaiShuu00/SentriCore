import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">
        <button onClick={() => navigate('/signin')}
                className="w-12 h-12 rounded-full bg-cream shadow flex items-center justify-center text-2xl text-ink mb-6">
          ‹
        </button>

        <h1 className="text-4xl font-extrabold text-ink mb-2">Forgot your Password?</h1>
        <p className="text-ink/70 mb-8">Enter your email address below to proceed</p>

        <label className="block text-lg font-bold text-ink mb-2">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          className="w-full border border-ink/30 rounded-2xl px-5 py-4 text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 mb-8"
        />

        <button
          onClick={() => navigate('/create-password')}
          className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full active:scale-95 transition tracking-wide"
        >
          PROCEED
        </button>
      </div>
    </div>
  );
}
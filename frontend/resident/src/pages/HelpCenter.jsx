import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const topics = ['Getting Started', 'Account Management', 'Troubleshooting', 'Security & Privacy'];
  const support = [
    { icon: '💬', title: 'SMS Support', desc: 'Response within 24h' },
    { icon: '✉️', title: 'Email Support', desc: 'Response within 24h' },
  ];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Help Center</h1>
          <p className="text-white/70 text-sm">Need assistance?</p>
        </div>
      </header>

      <div className="px-4 space-y-5 mt-5">
        {/* How can we help */}
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">How can we help you?</h2>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-3 shadow-sm mb-6">
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search help articles"
                   className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
          </div>

          <h3 className="text-xl font-extrabold text-ink mb-3">Popular Topics</h3>
          <div className="space-y-3">
            {topics.map((t) => (
              <button key={t} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
                <span className="font-semibold text-ink">{t}</span>
                <span className="text-ink">›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Contact Support</h2>
          <div className="space-y-3">
            {support.map((s) => (
              <div key={s.title} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="font-semibold text-ink">{s.title}</p>
                  <p className="text-sm text-ink/60">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
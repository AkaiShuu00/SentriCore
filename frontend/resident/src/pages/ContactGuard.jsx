import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getGuards } from '../api';
import { Phone, ShieldCheck, RefreshCw } from 'lucide-react';

const DARK = '#0A4A4A';

export default function ContactGuard() {
  const navigate = useNavigate();
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    getGuards()
      .then((res) => setGuards(res.data || []))
      .catch(() => setError('Hindi ma-load ang listahan ng guards.'))
      .finally(() => setLoading(false));
  };

  // Real-time: i-refresh ang on/off duty status tuwing 20s (silent — walang loading flicker)
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 20000);
    return () => clearInterval(id);
  }, []);

  const statusStyle = {
    'ON DUTY': { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
    'ON BREAK': { backgroundColor: '#F1D88A', color: '#8a6d12' },
    'OFF DUTY': { backgroundColor: '#D9D9D9', color: '#555' },
    'UNAVAILABLE': { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  };

  const filtered = guards;

  const callGuard = (g) => {
    const number = (g.phone || '').replace(/[^\d+]/g, '');
    if (!number) { alert('Walang contact number ang guard na ito.'); return; }
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <PageHeader title="Contact Guard" showBack onBack={() => navigate('/home')} />

      <div className="px-4 pt-4">
        <h2 className="text-2xl font-extrabold text-center mb-4" style={{ color: DARK }}>SECURITY GUARD LIST</h2>

        {/* Guard list card */}
        <div className="bg-white rounded-3xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ink/70">Select guard to contact</p>
            <button onClick={() => load()} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="border-b border-gray-200 mb-4" />

          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {loading ? (
              <p className="text-center text-ink/50 py-6">Loading guards...</p>
            ) : error ? (
              <p className="text-center text-red-600 py-6">{error}</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-ink/50 py-6">No guards found.</p>
            ) : (
              filtered.map((g, i) => {
                const canCall = g.status === 'ON DUTY' && !!g.phone;
                return (
                  <div key={g.guardId || i} className="border border-gray-100 rounded-2xl p-4 shadow-sm relative">
                    <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded" style={statusStyle[g.status] || statusStyle['OFF DUTY']}>
                      {g.status}
                    </span>
                    <div className="flex items-center gap-2 pr-20">
                      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <ShieldCheck size={18} className="text-ink" />
                      </div>
                      <p className="font-semibold text-ink">{g.name}</p>
                    </div>
                    <p className="text-sm text-ink/70 mt-2">Contact Number: {g.phone || '—'}</p>
                    <p className="text-sm text-ink/70">Email Address: {g.email || '—'}</p>
                    <p className="text-sm text-ink/70">Assigned Gate: {g.gate || '-'}</p>
                    <div className="flex justify-center mt-3">
                      <button
                        disabled={!canCall}
                        onClick={() => canCall && callGuard(g)}
                        className={`px-8 py-2 rounded-full font-semibold inline-flex items-center gap-2 whitespace-nowrap ${canCall ? 'text-ink' : 'text-ink/40'}`}
                        style={{ backgroundColor: canCall ? '#A9D0F5' : '#D9D9D9' }}>
                        <Phone size={16} /> CALL
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
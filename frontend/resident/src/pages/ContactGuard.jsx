import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FILTERS = ['ALL', 'ON DUTY', 'ON BREAK', 'OFF DUTY', 'UNAVAILABLE'];

export default function ContactGuard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  // Sample data (ikokonekta sa backend after — /api/guards/on-duty)
  const guards = [
    { name: 'Aiyana B. Fruto', phone: '0917 123 4567', email: 'guardone@gmail.com', gate: 'Gate 1', status: 'ON DUTY' },
    { name: 'Tywin Lannister', phone: '0918 689 3205', email: 'guardtwo@gmail.com', gate: 'Gate 2', status: 'ON BREAK' },
    { name: 'Sansa Stark', phone: '0978 461 1289', email: 'guardthree@gmail.com', gate: '-', status: 'OFF DUTY' },
    { name: 'Margaery Tyrell', phone: '0946 385 1222', email: 'guardfour@gmail.com', gate: '-', status: 'UNAVAILABLE' },
  ];

  const statusStyle = {
    'ON DUTY': { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
    'ON BREAK': { backgroundColor: '#F1D88A', color: '#8a6d12' },
    'OFF DUTY': { backgroundColor: '#D9D9D9', color: '#555' },
    'UNAVAILABLE': { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  };

  const filtered = guards
    .filter(g => filter === 'ALL' || g.status === filter)
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <h1 className="text-2xl font-extrabold text-white">Back to Home</h1>
      </header>

      <div className="px-4">
        <h2 className="text-3xl font-extrabold text-ink text-center my-6">SECURITY GUARD LIST</h2>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search guard name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* Filter chips — scrollable */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-bold shadow shrink-0 ${filter === f ? 'text-white' : 'bg-white text-ink'}`}
                    style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* Guard list card */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4">
          <p className="text-ink/70 mb-3">Select guard to contact</p>
          <div className="border-b border-gray-200 mb-4" />

          <div className="max-h-[55vh] overflow-y-auto space-y-4">
            {filtered.length === 0 ? (
              <p className="text-center text-ink/50 py-6">No guards found.</p>
            ) : (
              filtered.map((g, i) => {
                const canCall = g.status === 'ON DUTY';
                return (
                  <div key={i} className="border border-gray-100 rounded-2xl p-4 shadow-sm relative">
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded" style={statusStyle[g.status]}>
                      {g.status}
                    </span>
                    <p className="font-bold text-ink pr-20">{g.name}</p>
                    <p className="text-sm text-ink/70">Contact Number: {g.phone}</p>
                    <p className="text-sm text-ink/70">Email Address: {g.email}</p>
                    <p className="text-sm text-ink/70">Assigned Gate: {g.gate}</p>
                    <div className="flex justify-center mt-3">
                      <button
                        disabled={!canCall}
                        onClick={() => canCall && (window.location.href = `tel:${g.phone.replace(/\s/g, '')}`)}
                        className={`px-8 py-2 rounded-full font-bold flex items-center gap-2 ${canCall ? 'text-ink' : 'text-ink/40'}`}
                        style={{ backgroundColor: canCall ? '#A9D0F5' : '#D9D9D9' }}>
                        CALL 📞
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
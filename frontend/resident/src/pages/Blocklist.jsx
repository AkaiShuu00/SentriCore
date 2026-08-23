import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Blocklist() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');

  // Sample data (ikokonekta sa backend after)
  const [list, setList] = useState([
    { date: 'June 2, 2026', time: '02:15 PM', name: 'Hailey Cabalin', reason: 'Rude behavior' },
    { date: 'March 12, 2026', time: '10:29 AM', name: 'Fiona Mercado', reason: 'Unauthorized entry attempt' },
    { date: 'Aug 11, 2025', time: '07:30 AM', name: 'Aiyana Fruto', reason: 'Loitering' },
  ]);

  function handleAdd() {
    if (!name || !reason) return;
    const now = new Date();
    setList([{
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      name, reason,
    }, ...list]);
    setName(''); setReason(''); setShowAdd(false);
  }

  const filtered = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Blocklisted</h1>
          <p className="text-white/70 text-sm">View and manage all blocklisted individual</p>
        </div>
      </header>

      <div className="px-4 mt-5">
        {/* Add + Export buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowAdd(true)}
                  className="bg-white rounded-2xl p-5 shadow flex flex-col items-center gap-1">
            <span className="text-2xl">🧑‍➕</span>
            <span className="font-bold text-ink">Add blocklist</span>
          </button>
          <button className="bg-white rounded-2xl p-5 shadow flex flex-col items-center gap-1">
            <span className="text-2xl">⬇️</span>
            <span className="font-bold text-ink">Export List</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow mt-4">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* List card */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Blocklisted</h2>

          {/* Total */}
          <div className="rounded-2xl px-6 py-4 flex items-center justify-between text-white shadow mb-4"
               style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
            <span className="text-2xl font-extrabold">TOTAL</span>
            <span className="text-2xl font-extrabold">{list.length}</span>
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto space-y-3">
            {filtered.map((b, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="text-xs text-ink w-24 shrink-0">
                  <p className="font-bold">{b.date}</p>
                  <p className="text-ink/60">{b.time}</p>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-ink">{b.name}</p>
                  <p className="text-sm text-ink/60">Reason: {b.reason}</p>
                </div>
                <button className="text-ink/40 text-xl">⋮</button>
              </div>
            ))}
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-2xl p-4 mt-4" style={{ backgroundColor: '#BFDBFE' }}>
          <p className="font-bold text-sm" style={{ color: '#1E3A8A' }}>Blocklisted individuals will be flagged on future entries</p>
          <p className="text-sm" style={{ color: '#1E40AF' }}>Guards will be notified for awareness and verification</p>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-30 max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-6 w-full">
            <h3 className="text-2xl font-extrabold text-ink mb-4">Add to Block List</h3>
            <label className="block font-bold text-ink mb-2">Person's Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
                   className="w-full border border-ink/30 rounded-2xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-ink/30" />
            <label className="block font-bold text-ink mb-2">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                      className="w-full border border-ink/30 rounded-2xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-ink/30" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)}
                      className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink">Cancel</button>
              <button onClick={handleAdd}
                      className="flex-1 py-3 rounded-full text-white font-bold" style={{ backgroundColor: '#0F6E6E' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
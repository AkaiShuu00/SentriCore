import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBlocklist } from '../api';
import { Ban } from 'lucide-react';

const ink = '#112D31';
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function Blocklist() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBlocklist()
      .then((res) => setList(res.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="px-5 py-6 flex items-center gap-4" style={{ backgroundColor: ink }}>
        <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl shrink-0" style={{ color: ink }}>‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Blocklisted</h1>
          <p className="text-white/70 text-sm">People you reported and the admin approved</p>
        </div>
      </header>

      <div className="px-4 py-5">
        {/* Paalala: through complaints na lang ang pag-blocklist */}
        <div className="rounded-2xl px-4 py-3 mb-4 text-sm" style={{ backgroundColor: '#F5F2E9', color: '#5b4a2e' }}>
          Para mag-blocklist ng bisita, mag-file ng <span className="font-bold">Visitor Complaint</span> at i-on ang blocklist option. Ire-review ito ng admin bago maidagdag dito.
        </div>

        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="flex justify-center mb-2"><Ban size={30} className="text-ink/40" /></div>
            <p className="font-semibold text-ink text-sm">Walang naka-blocklist</p>
            <p className="text-ink/60 text-xs mt-1">Ang mga aprubadong blocklist request mo ay lalabas dito.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((b) => (
              <div key={b.block_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3C9C9' }}><Ban size={20} style={{ color: '#9b2c2c' }} /></div>
                <div className="flex-1">
                  <p className="font-bold text-ink text-sm">{b.person_name}</p>
                  {b.reason && <p className="text-xs text-ink/60">{b.reason}</p>}
                  {b.added_at && <p className="text-[10px] text-ink/40 mt-0.5">Added {fmt(b.added_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
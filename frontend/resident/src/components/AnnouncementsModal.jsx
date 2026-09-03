import { useState, useEffect } from 'react';
import { getAnnouncements } from '../api';

// Umiikot na icon depende sa nilalaman (visual lang; walang hardcoded na text)
function iconFor(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('fire')) return { icon: '🔥', bg: 'bg-white' };
  if (t.includes('water')) return { icon: '💧', bg: 'bg-yellow-100' };
  if (t.includes('power') || t.includes('electric')) return { icon: '⚡', bg: 'bg-yellow-100' };
  if (t.includes('gate') || t.includes('cctv') || t.includes('closed')) return { icon: '🛑', bg: 'bg-white' };
  if (t.includes('meeting') || t.includes('election') || t.includes('homeowner')) return { icon: '🧑', bg: 'bg-red-100' };
  return { icon: '📢', bg: 'bg-white' };
}

export default function AnnouncementsModal({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements()
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #E8F1EE 0%, #FFFFFF 60%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-ink text-center mb-5">ANNOUNCEMENTS</h2>

        {loading ? (
          <p className="text-center text-ink/50 py-8">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-ink/60 font-semibold">No announcements yet</p>
          </div>
        ) : (
          items.map((a, i) => {
            const { icon, bg } = iconFor(a.title + ' ' + a.content);
            return (
              <div key={a.announcement_id || i}>
                <div className="flex items-center gap-4 py-4">
                  <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-ink">{a.title}</p>
                    {a.content && <p className="text-xs text-ink/70">{a.content}</p>}
                  </div>
                </div>
                {i < items.length - 1 && <div className="border-b border-ink/10" />}
              </div>
            );
          })
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 bg-ink text-white font-bold py-3 rounded-full active:scale-95 transition"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
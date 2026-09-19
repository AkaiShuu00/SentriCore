// Reusable announcements modal — magagamit sa guard at resident home.
// Kumukuha ng TOTOONG announcements mula backend (naka-filter na ayon sa role
// at active window). Pag-pindot sa isang item → detail pop-up na malinaw.
import { useState, useEffect } from 'react';
import { getAnnouncements } from '../api';
import { Flame, Droplet, Zap, ShieldAlert, Users, Wrench, Megaphone } from 'lucide-react';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

// Icon component base sa category/title (fallback Megaphone)
const IconFor = ({ a, ...p }) => {
  const t = `${a.category || ''} ${a.title || ''}`.toLowerCase();
  if (t.includes('fire')) return <Flame {...p} />;
  if (t.includes('water')) return <Droplet {...p} />;
  if (t.includes('power') || t.includes('electric')) return <Zap {...p} />;
  if (t.includes('gate') || t.includes('security')) return <ShieldAlert {...p} />;
  if (t.includes('meeting') || t.includes('event') || t.includes('election')) return <Users {...p} />;
  if (t.includes('maintenance')) return <Wrench {...p} />;
  return <Megaphone {...p} />;
};

const priorityStyle = (p) => {
  const v = (p || '').toLowerCase();
  if (v === 'high' || v === 'urgent') return { bg: '#F3C9C9', fg: '#9b2c2c' };
  if (v === 'medium') return { bg: '#F1D88A', fg: '#8a6d12' };
  if (v === 'low') return { bg: '#B4E4BE', fg: '#1e6b2e' };
  return { bg: '#E4E4E4', fg: '#555' };
};

export default function AnnouncementsModal({ items = null, onClose }) {
  const [list, setList] = useState(items || []);
  const [loading, setLoading] = useState(!items);
  const [detail, setDetail] = useState(null); // napiling announcement → pop-up

  useEffect(() => {
    if (items) return; // kung may ibinigay na, huwag nang mag-fetch
    getAnnouncements()
      .then((res) => setList(res.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [items]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #E8F1EE 0%, #FFFFFF 60%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-ink text-center mb-5">ANNOUNCEMENTS</h2>

        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading announcements…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-semibold text-ink text-sm">No announcements yet</p>
            <p className="text-ink/60 text-xs mt-1">New community announcements will appear here.</p>
          </div>
        ) : (
          list.map((a, i) => {
            const ps = priorityStyle(a.priority);
            return (
              <div key={a.announcement_id || i}>
                <button
                  onClick={() => setDetail(a)}
                  className="w-full text-left flex items-center gap-4 py-4 active:scale-[0.99] transition"
                >
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <IconFor a={a} size={20} className="text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink truncate">{a.title}</p>
                    <p className="text-xs text-ink/60 truncate">{a.content}</p>
                  </div>
                  {a.priority && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: ps.bg, color: ps.fg }}>
                      {a.priority}
                    </span>
                  )}
                </button>
                {i < list.length - 1 && <div className="border-b border-ink/10" />}
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

      {/* DETAIL POP-UP — malinaw na buong detalye na inilagay ng admin */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6"
             onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative"
               onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-ink font-bold">✕</button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center shadow-sm"
                   style={{ backgroundColor: '#F5F2E9' }}><IconFor a={detail} size={22} className="text-teal-700" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold text-ink leading-tight">{detail.title}</h3>
                <div className="flex gap-2 mt-1">
                  {detail.category && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">{detail.category}</span>
                  )}
                  {detail.priority && (() => { const ps = priorityStyle(detail.priority); return (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: ps.bg, color: ps.fg }}>{detail.priority}</span>
                  ); })()}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{detail.content}</p>
            </div>

            {(detail.recipients || detail.start_date || detail.end_date) && (
              <div className="mt-4 rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: '#F5F2E9' }}>
                {detail.recipients && (
                  <p className="text-xs text-ink"><span className="font-bold">For:</span> {detail.recipients}</p>
                )}
                {detail.start_date && (
                  <p className="text-xs text-ink"><span className="font-bold">Starts:</span> {fmtDate(detail.start_date)}</p>
                )}
                {detail.end_date && (
                  <p className="text-xs text-ink"><span className="font-bold">Until:</span> {fmtDate(detail.end_date)}</p>
                )}
              </div>
            )}

            <button onClick={() => setDetail(null)}
                    className="w-full mt-5 bg-ink text-white font-bold py-3 rounded-full active:scale-95 transition">
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
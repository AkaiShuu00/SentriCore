import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import { Bell, Megaphone, Ban } from 'lucide-react';

const ink = '#112D31';
const IconFor = ({ type, ...p }) => type === 'blocklist' ? <Ban {...p} /> : type === 'complaint' ? <Megaphone {...p} /> : <Bell {...p} />;
const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function Notifications() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => getNotifications()
    .then((res) => setList(res.data?.list || []))
    .catch(() => setList([]))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = async (n) => {
    if (!n.is_read) {
      try { await markNotificationRead(n.notification_id); } catch { /* ignore */ }
      setList((prev) => prev.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: 1 } : x));
    }
  };
  const readAll = async () => {
    try { await markAllNotificationsRead(); } catch { /* ignore */ }
    setList((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
  };

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="px-5 py-6 flex items-center gap-4" style={{ backgroundColor: ink }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl shrink-0" style={{ color: ink }}>‹</button>
        <h1 className="text-2xl font-extrabold text-white flex-1">Notifications</h1>
        <button onClick={readAll} className="text-white/80 text-xs font-bold underline">Mark all read</button>
      </header>

      <div className="px-4 py-5">
        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="flex justify-center mb-2"><Bell size={30} className="text-ink/40" /></div>
            <p className="font-semibold text-ink text-sm">No notifications yet</p>
            <p className="text-ink/60 text-xs mt-1">Updates about your complaints and account will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <button key={n.notification_id} onClick={() => open(n)}
                      className="w-full text-left rounded-2xl p-4 shadow-sm border flex gap-3"
                      style={{ backgroundColor: n.is_read ? '#fff' : '#EAF4F1', borderColor: n.is_read ? '#eee' : '#0F6E6E33' }}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><IconFor type={n.type} size={18} className="text-ink" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink text-sm">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }} />}
                  </div>
                  <p className="text-xs text-ink/70 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-ink/40 mt-1">{fmt(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
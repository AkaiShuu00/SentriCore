import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import { Bell, Megaphone, Ban, ShieldAlert } from 'lucide-react';

const DARK = '#0A4A4A';
const IconFor = ({ type, ...p }) =>
  type === 'blocklist' ? <Ban {...p} />
  : type === 'report' ? <ShieldAlert {...p} />
  : type === 'complaint' ? <Megaphone {...p} />
  : <Bell {...p} />;
const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => getNotifications()
    .then((res) => setList(res.data?.list || []))
    .catch(() => setList([]))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  // READ-ONLY: pagpindot = markahan lang bilang nabasa; WALANG navigation papunta kahit saan.
  const markRead = async (n) => {
    if (n.is_read) return;
    try { await markNotificationRead(n.notification_id); } catch { /* ignore */ }
    setList((prev) => prev.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: 1 } : x));
  };
  const readAll = async () => {
    try { await markAllNotificationsRead(); } catch { /* ignore */ }
    setList((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
  };

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <PageHeader
        title="Notifications"
        showBack
        right={<button onClick={readAll} className="text-white/85 text-xs font-bold underline whitespace-nowrap">Mark all read</button>}
      />

      <div className="px-4 pt-4">
        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="flex justify-center mb-2"><Bell size={30} className="text-ink/40" /></div>
            <p className="font-semibold text-sm" style={{ color: DARK }}>No notifications yet</p>
            <p className="text-ink/60 text-xs mt-1">Updates about complaints, reports and your account will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <button key={n.notification_id} onClick={() => markRead(n)}
                      className="w-full text-left rounded-2xl p-4 shadow-sm border flex gap-3"
                      style={{ backgroundColor: n.is_read ? '#fff' : '#EAF4F1', borderColor: n.is_read ? '#eee' : '#0F6E6E33' }}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><IconFor type={n.type} size={18} style={{ color: DARK }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm" style={{ color: DARK }}>{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#0F6E6E' }} />}
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import { createGuardReport, getMyGuardReports, resolveGuardReport, reopenGuardReport, deleteGuardReport } from '../../api';
import { ShieldAlert, AlertTriangle, Siren, MapPin, CheckCircle2, RotateCcw, MessageSquare, X, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'Security Concern', Icon: ShieldAlert, label: 'SECURITY CONCERN',
    hint: 'e.g. suspicious van inside the area, a vehicle parked for almost a month' },
  { key: 'Small Problem', Icon: AlertTriangle, label: 'SMALL PROBLEM',
    hint: 'e.g. minor noise, littering, improper parking, small dispute' },
  { key: 'Incident', Icon: Siren, label: 'INCIDENT HAPPENED',
    hint: 'e.g. a visitor caused trouble, a fight, property was damaged' },
];

const TYPES_BY_CATEGORY = {
  'Security Concern': ['Suspicious vehicle', 'Long-parked vehicle', 'Suspicious person', 'Trespassing', 'Unauthorized entry', 'Others'],
  'Small Problem': ['Noise', 'Littering', 'Improper parking', 'Minor dispute', 'Loitering', 'Others'],
  'Incident': ['Visitor caused disturbance', 'Physical altercation', 'Property damage', 'Theft', 'Medical / emergency', 'Others'],
};

const CAT_COLOR = {
  'Security Concern': { bg: '#F3C9C9', fg: '#9b2c2c' },
  'Small Problem': { bg: '#F1D88A', fg: '#8a6d12' },
  'Incident': { bg: '#D9C2E9', fg: '#5b2c86' },
};
const STATUS_COLOR = {
  Open: { bg: '#F1D88A', fg: '#8a6d12' },
  Acknowledged: { bg: '#CFE3F3', fg: '#1a5fa8' },
  Resolved: { bg: '#B4E4BE', fg: '#1e6b2e' },
};
const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function GuardReports() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');   // new | mine
  const [selected, setSelected] = useState(null);
  const [types, setTypes] = useState([]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenText, setReopenText] = useState('');
  const [busy, setBusy] = useState(false);

  // --- "Not read" indicator: Acknowledged na ni admin pero hindi pa nabubuksan ng guard ---
  const SEEN_KEY = 'sc_guard_seen_acks';
  const [seenAcks, setSeenAcks] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const persistSeen = (set) => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
  };
  const markSeen = (id) => setSeenAcks((prev) => {
    if (prev.has(id)) return prev;
    const next = new Set(prev); next.add(id); persistSeen(next); return next;
  });
  const isUnread = (r) => r.status === 'Acknowledged' && !seenAcks.has(r.report_id);
  const unreadCount = mine.filter(isUnread).length;

  const loadMine = () => {
    setLoadingMine(true);
    getMyGuardReports().then((res) => {
      const list = res.data || [];
      setMine(list);
      // Linisin ang 'seen' para sa mga bumalik sa Open (re-submitted) — para mag-notify ulit kapag na-acknowledge muli
      setSeenAcks((prev) => {
        const openIds = new Set(list.filter((r) => r.status === 'Open').map((r) => r.report_id));
        let changed = false;
        const next = new Set(prev);
        for (const id of prev) if (openIds.has(id)) { next.delete(id); changed = true; }
        if (changed) persistSeen(next);
        return changed ? next : prev;
      });
    }).catch(() => setMine([])).finally(() => setLoadingMine(false));
  };
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab]);

  const toggleType = (t) => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  const selectCategory = (key) => { setSelected(key); setTypes([]); };

  async function handleSubmit() {
    if (submitting) return;
    if (!selected) { alert('Please select a report category.'); return; }
    if (types.length === 0) { alert('Please select at least one type of concern.'); return; }
    setSubmitting(true);
    try {
      await createGuardReport({ category: selected, reportType: types.join(', '), location: location || null, description: description || null });
      alert('Report submitted. The admin has been notified.');
      setSelected(null); setTypes([]); setLocation(''); setDescription('');
      setTab('mine');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally { setSubmitting(false); }
  }

  const markResolved = async (r) => {
    if (!window.confirm('Mark this report as resolved? Do this only if the issue is already settled.')) return;
    setBusy(true);
    try { await resolveGuardReport(r.report_id); loadMine(); }
    catch { alert('Failed to update. Please try again.'); }
    finally { setBusy(false); }
  };
  const removeReport = async (r) => {
    if (!window.confirm('Delete this report? This can only be done while it is still Open.')) return;
    setBusy(true);
    try { await deleteGuardReport(r.report_id); loadMine(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete.'); }
    finally { setBusy(false); }
  };

  const submitReopen = async () => {
    if (!reopenTarget) return;
    setBusy(true);
    try { await reopenGuardReport(reopenTarget.report_id, { description: reopenText || null }); setReopenTarget(null); setReopenText(''); loadMine(); }
    catch { alert('Failed to re-submit. Please try again.'); }
    finally { setBusy(false); }
  };

  const categoryTitle = CATEGORIES.find((c) => c.key === selected)?.label || '';
  const categoryHint = CATEGORIES.find((c) => c.key === selected)?.hint || '';

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/guard-home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <h1 className="text-2xl font-extrabold text-white">Guard Report</h1>
      </header>

      <div className="px-4">
        <div className="flex gap-2 mt-5 mb-4">
          <button onClick={() => setTab('new')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
                  style={tab === 'new' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            New Report
          </button>
          <button onClick={() => setTab('mine')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2"
                  style={tab === 'mine' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            My Reports
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center"
                    style={tab === 'mine' ? { backgroundColor: '#fff', color: '#0F6E6E' } : { backgroundColor: '#DC2626', color: '#fff' }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {tab === 'new' ? (
          <>
            <div className="bg-white rounded-3xl p-5 shadow">
              <p className="text-ink/70 mb-3">Select a report category to continue</p>
              <div className="border-b border-gray-200 mb-4" />
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const isSel = selected === c.key;
                  return (
                    <button key={c.key} onClick={() => selectCategory(c.key)}
                            className={`rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm border-2 transition bg-white ${isSel ? 'border-ink opacity-100' : 'border-gray-200 opacity-60'}`}>
                      <c.Icon size={24} style={{ color: isSel ? CAT_COLOR[c.key].fg : '#9ca3af' }} />
                      <span className={`text-[10px] font-semibold text-center leading-tight ${isSel ? 'text-ink' : 'text-ink/50'}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div className="bg-white rounded-3xl p-6 shadow mt-5">
                <h3 className="text-xl font-extrabold text-ink text-center mb-1">{categoryTitle}</h3>
                <p className="text-xs text-ink/50 text-center mb-4">{categoryHint}</p>
                <div className="border-b border-gray-200 mb-5" />

                <label className="block font-semibold text-ink mb-2">Type of Concern</label>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(TYPES_BY_CATEGORY[selected] || []).map((t) => (
                    <button key={t} onClick={() => toggleType(t)}
                            className={`px-4 py-2 rounded-full text-sm border ${types.includes(t) ? 'text-white border-ink' : 'text-ink border-ink/30'}`}
                            style={types.includes(t) ? { backgroundColor: '#0F6E6E', borderColor: '#0F6E6E' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>

                <label className="block font-semibold text-ink mb-2">Location</label>
                <div className="relative mb-5">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input value={location} onChange={(e) => setLocation(e.target.value)}
                         placeholder="e.g. Gate 1, Block 5 parking, Clubhouse"
                         className="w-full border border-ink/30 rounded-2xl pl-11 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-ink/30" />
                </div>

                <label className="block font-semibold text-ink mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                          placeholder="Describe what you observed or what happened…"
                          className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

                <button onClick={handleSubmit} disabled={submitting}
                        className="w-full bg-ink text-white font-semibold text-lg py-4 rounded-full active:scale-95 transition disabled:opacity-60 whitespace-nowrap">
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {loadingMine ? (
              <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
            ) : mine.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
                <div className="flex justify-center mb-2"><ShieldAlert size={30} className="text-ink/40" /></div>
                <p className="font-semibold text-ink text-sm">No reports yet</p>
                <p className="text-ink/60 text-xs mt-1">Your submitted reports will appear here.</p>
              </div>
            ) : mine.map((r) => {
              const cc = CAT_COLOR[r.category] || { bg: '#eee', fg: '#555' };
              const sc = STATUS_COLOR[r.status] || STATUS_COLOR.Open;
              const expanded = openThread === r.report_id;
              const unread = isUnread(r);
              return (
                <div key={r.report_id} className="rounded-2xl p-4 shadow-sm"
                     style={unread
                       ? { backgroundColor: '#EAF4F1', border: '1px solid #0F6E6E55' }
                       : { backgroundColor: '#fff', border: '1px solid #f3f4f6' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{r.category}</span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{r.status}</span>
                  </div>
                  {unread && (
                    <p className="text-[11px] font-bold mb-1 inline-flex items-center gap-1.5" style={{ color: '#0F6E6E' }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }} />
                      Acknowledged by admin — tap to view
                    </p>
                  )}
                  <p className="font-semibold text-ink text-sm">{r.report_type}</p>
                  {r.location && (
                    <p className="text-xs text-ink/60 mt-0.5 inline-flex items-center gap-1">
                      <MapPin size={12} className="text-ink/40" /> {r.location}
                    </p>
                  )}
                  <p className="text-[10px] text-ink/40 mt-1">{fmt(r.created_at)}</p>

                  <button onClick={() => { setOpenThread(expanded ? null : r.report_id); markSeen(r.report_id); }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                    <MessageSquare size={13} /> {expanded ? 'Hide thread' : 'View thread'}
                  </button>
                  {expanded && r.description && (
                    <div className="rounded-xl px-3 py-2 mt-2" style={{ backgroundColor: '#F5F2E9' }}>
                      <p className="text-xs text-ink whitespace-pre-wrap">{r.description}</p>
                    </div>
                  )}

                  {r.status === 'Resolved' && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                      <CheckCircle2 size={13} /> You marked this resolved.
                    </div>
                  )}
                  {r.status === 'Acknowledged' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => markResolved(r)} disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap disabled:opacity-60" style={{ backgroundColor: '#1e8e5a' }}>
                        <CheckCircle2 size={14} /> Mark Resolved
                      </button>
                      <button onClick={() => { setReopenTarget(r); setReopenText(''); }} disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border border-ink/30 text-ink disabled:opacity-60">
                        <RotateCcw size={14} /> Re-submit
                      </button>
                    </div>
                  )}
                  {r.status === 'Open' && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-ink/50 italic">Waiting for the admin to acknowledge this report.</p>
                      <button onClick={() => removeReport(r)} disabled={busy}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 whitespace-nowrap disabled:opacity-60 shrink-0">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-submit modal */}
      {reopenTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setReopenTarget(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setReopenTarget(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h3 className="text-lg font-extrabold text-ink mb-1">Re-submit Report</h3>
            <p className="text-xs text-ink/60 mb-3">Still not resolved? Add more details and send it back to the admin.</p>
            <textarea value={reopenText} onChange={(e) => setReopenText(e.target.value)} rows={4}
                      placeholder="What is still unresolved? Add any new details…"
                      className="w-full border border-ink/30 rounded-2xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-ink/30" />
            <button onClick={submitReopen} disabled={busy}
                    className="w-full bg-ink text-white font-semibold py-3 rounded-full disabled:opacity-60 whitespace-nowrap">
              {busy ? 'Sending…' : 'Re-submit'}
            </button>
          </div>
        </div>
      )}

      <GuardBottomNav active="home" />
    </div>
  );
}
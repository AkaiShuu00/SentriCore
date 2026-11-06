import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaint, getMyComplaints, residentResolveComplaint, reopenComplaint } from '../api';
import { UserX, Shield, Siren, Building2, CheckCircle2, RotateCcw, X, MessageSquare } from 'lucide-react';

const CATEGORIES = [
  { key: 'visitor', Icon: UserX, label: 'VISITOR COMPLAINT' },
  { key: 'guard', Icon: Shield, label: 'GUARD COMPLAINT' },
  { key: 'security', Icon: Siren, label: 'SECURITY CONCERN' },
  { key: 'hoa', Icon: Building2, label: 'HOA CONCERN' },
];

const TYPES_BY_CATEGORY = {
  visitor: ['Rude behavior', 'Property damage', 'Loitering', 'Unauthorized entry attempt', 'Vandalism', 'Others'],
  guard: ['Slow entry process', 'Rude behavior', 'Absent from post', 'Discriminatory treatment', 'Others'],
  security: ['Suspicious activity', 'Trespassing', 'Theft', 'Vandalism', 'Others'],
  hoa: ['Noise complaint', 'Maintenance issue', 'Parking violation', 'Policy concern', 'Others'],
};

const CAT_MAP = { visitor: 'Visitor', guard: 'Guard', security: 'Security', hoa: 'HOA' };
const STATUS_COLOR = {
  Pending: { bg: '#F3C9C9', fg: '#9b2c2c' },
  Acknowledged: { bg: '#F1D88A', fg: '#8a6d12' },
  Resolved: { bg: '#B4E4BE', fg: '#1e6b2e' },
};
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function Complaints() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');  // new | mine

  // ── New complaint form ──
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [dateIncident, setDateIncident] = useState('');
  const [types, setTypes] = useState([]);
  const [description, setDescription] = useState('');
  const [blocklist, setBlocklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── My complaints ──
  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [openThread, setOpenThread] = useState(null);   // complaint_id na naka-expand
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenText, setReopenText] = useState('');
  const [busy, setBusy] = useState(false);

  const loadMine = () => {
    setLoadingMine(true);
    getMyComplaints().then((res) => setMine(res.data || [])).catch(() => setMine([])).finally(() => setLoadingMine(false));
  };
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab]);

  const toggleType = (t) => setTypes(types.includes(t) ? types.filter(x => x !== t) : [...types, t]);
  const selectCategory = (key) => { setSelected(key); setTypes([]); };

  async function handleConfirm() {
    if (submitting) return;
    if (!name.trim()) { alert('Please enter the ' + nameLabel.toLowerCase() + '.'); return; }
    if (types.length === 0) { alert('Please select at least one type of complaint.'); return; }
    setSubmitting(true);
    try {
      await createComplaint({
        category: CAT_MAP[selected],
        subject: name.trim(),
        incidentDate: dateIncident || null,
        complaintType: types.join(', '),
        description: description || null,
        blocklist: selected === 'visitor' ? blocklist : false,
      });
      alert('Complaint submitted!' + (blocklist && selected === 'visitor' ? ' Visitor flagged for admin review.' : ''));
      setSelected(null); setName(''); setDateIncident(''); setTypes([]); setDescription(''); setBlocklist(false);
      setTab('mine');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const markResolved = async (c) => {
    if (!window.confirm('Mark this complaint as resolved? Do this only if the issue is already settled.')) return;
    setBusy(true);
    try { await residentResolveComplaint(c.complaint_id); loadMine(); }
    catch { alert('Failed to update. Please try again.'); }
    finally { setBusy(false); }
  };

  const submitReopen = async () => {
    if (!reopenTarget) return;
    setBusy(true);
    try {
      await reopenComplaint(reopenTarget.complaint_id, { description: reopenText || null });
      setReopenTarget(null); setReopenText(''); loadMine();
    } catch { alert('Failed to re-submit. Please try again.'); }
    finally { setBusy(false); }
  };

  const categoryTitle = CATEGORIES.find(c => c.key === selected)?.label || '';
  const nameLabel = selected === 'visitor' ? 'Visitor Name' : selected === 'guard' ? 'Guard Name' : 'Subject';
  const namePlaceholder = selected === 'visitor' ? 'Full name of visitor' : selected === 'guard' ? 'Full name of guard' : 'Enter subject';

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <h1 className="text-2xl font-extrabold text-white">Back to Home</h1>
      </header>

      <div className="px-4">
        {/* #3 — pinaliit ang heading para hindi masyadong sumakop */}
        <h2 className="text-xl font-extrabold text-ink text-center my-4 tracking-wide">Resident Complaints</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('new')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
                  style={tab === 'new' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            New Complaint
          </button>
          <button onClick={() => setTab('mine')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
                  style={tab === 'mine' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            My Complaints
          </button>
        </div>

        {tab === 'new' ? (
          <>
            <div className="bg-white rounded-3xl p-5 shadow">
              <p className="text-ink/70 mb-3">Select a complaint category to continue</p>
              <div className="border-b border-gray-200 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((c) => {
                  const isSel = selected === c.key;
                  return (
                    <button key={c.key} onClick={() => selectCategory(c.key)}
                            className={`rounded-2xl p-5 flex flex-col items-center gap-2 shadow-sm border-2 transition bg-white ${isSel ? 'border-ink opacity-100' : 'border-gray-200 opacity-60'}`}>
                      <c.Icon size={26} className={isSel ? 'text-ink' : 'text-ink/50'} />
                      <span className={`text-xs font-bold ${isSel ? 'text-ink' : 'text-ink/50'}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div className="bg-white rounded-3xl p-6 shadow mt-5">
                <h3 className="text-xl font-extrabold text-ink text-center mb-1">{categoryTitle}</h3>
                <div className="border-b border-gray-200 mb-5" />

                <label className="block font-semibold text-ink mb-2">{nameLabel}</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                       placeholder={namePlaceholder}
                       className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

                <label className="block font-semibold text-ink mb-2">Date of Incident</label>
                <input type="date" value={dateIncident} onChange={(e) => setDateIncident(e.target.value)}
                       className="w-full box-border border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30"
                       style={{ WebkitAppearance: 'none', appearance: 'none', minWidth: 0, maxWidth: '100%' }} />

                <label className="block font-semibold text-ink mb-2">Type of Complaint</label>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(TYPES_BY_CATEGORY[selected] || []).map((t) => (
                    <button key={t} onClick={() => toggleType(t)}
                            className={`px-4 py-2 rounded-full text-sm border ${types.includes(t) ? 'text-white border-ink' : 'text-ink border-ink/30'}`}
                            style={types.includes(t) ? { backgroundColor: '#0F6E6E', borderColor: '#0F6E6E' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>

                <label className="block font-semibold text-ink mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                          placeholder="Provide details about what happened..."
                          className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

                {selected === 'visitor' && (
                  <div className="rounded-2xl p-4 mb-5 flex items-center justify-between" style={{ backgroundColor: '#F3C9C9' }}>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#8a2b2b' }}>Do you want to blocklist this visitor?</p>
                      <p className="text-xs" style={{ color: '#a44' }}>They will be flagged for admin review on future entries</p>
                    </div>
                    <button onClick={() => setBlocklist(!blocklist)}
                            className={`w-14 h-8 rounded-full flex items-center transition shrink-0 ${blocklist ? 'justify-end' : 'justify-start'}`}
                            style={{ backgroundColor: blocklist ? '#8a2b2b' : '#C4A0A0', padding: '3px' }}>
                      <span className="w-6 h-6 bg-white rounded-full shadow" />
                    </button>
                  </div>
                )}

                <button onClick={handleConfirm} disabled={submitting}
                        className="w-full bg-ink text-white font-semibold text-lg py-4 rounded-full tracking-wide active:scale-95 transition disabled:opacity-60 whitespace-nowrap">
                  {submitting ? 'Submitting…' : 'Submit Complaint'}
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
                <p className="font-semibold text-ink text-sm">No complaints yet</p>
                <p className="text-ink/60 text-xs mt-1">Your filed complaints and their status will appear here.</p>
              </div>
            ) : mine.map((c) => {
              const sc = STATUS_COLOR[c.status] || STATUS_COLOR.Pending;
              const expanded = openThread === c.complaint_id;
              return (
                <div key={c.complaint_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#EAF4F1', color: '#0F6E6E' }}>{c.category}</span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{c.status}</span>
                  </div>
                  <p className="font-semibold text-ink text-sm">{c.subject}</p>
                  <p className="text-xs text-ink/60">{c.complaint_type}{c.incident_date ? ` · ${fmt(c.incident_date)}` : ''}</p>

                  {/* Tap to open the THREAD (conversation history) */}
                  <button onClick={() => setOpenThread(expanded ? null : c.complaint_id)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                    <MessageSquare size={13} /> {expanded ? 'Hide thread' : 'View thread'}
                  </button>
                  {expanded && c.description && (
                    <div className="rounded-xl px-3 py-2 mt-2" style={{ backgroundColor: '#F5F2E9' }}>
                      <p className="text-xs text-ink whitespace-pre-wrap">{c.description}</p>
                    </div>
                  )}

                  {c.status === 'Resolved' && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                      <CheckCircle2 size={13} /> You marked this resolved.
                    </div>
                  )}

                  {/* Actions — only once acknowledged by admin, and not yet resolved */}
                  {c.status === 'Acknowledged' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => markResolved(c)} disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap disabled:opacity-60" style={{ backgroundColor: '#1e8e5a' }}>
                        <CheckCircle2 size={14} /> Mark Resolved
                      </button>
                      <button onClick={() => { setReopenTarget(c); setReopenText(''); }} disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border border-ink/30 text-ink disabled:opacity-60">
                        <RotateCcw size={14} /> Re-submit
                      </button>
                    </div>
                  )}
                  {c.status === 'Pending' && (
                    <p className="text-[11px] text-ink/50 mt-2 italic">Waiting for the admin to acknowledge this complaint.</p>
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
            <h3 className="text-lg font-extrabold text-ink mb-1">Re-submit Complaint</h3>
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
    </div>
  );
}
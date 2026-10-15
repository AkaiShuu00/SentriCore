import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import { createGuardReport, getMyGuardReports } from '../../api';
import { ShieldAlert, AlertTriangle, Siren, MapPin } from 'lucide-react';

// Tatlong kategorya ng report ni guard (hiwalay sa exit note; walang "No Problem").
const CATEGORIES = [
  { key: 'Security Concern', Icon: ShieldAlert, label: 'SECURITY CONCERN',
    hint: 'e.g. suspicious van inside the area, a vehicle parked for almost a month' },
  { key: 'Small Problem', Icon: AlertTriangle, label: 'SMALL PROBLEM',
    hint: 'e.g. minor noise, littering, improper parking, small dispute' },
  { key: 'Incident', Icon: Siren, label: 'INCIDENT HAPPENED',
    hint: 'e.g. a visitor caused trouble, a fight, property was damaged' },
];

// Type of concern kada kategorya (parang sa resident complaints).
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
const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function GuardReport() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');   // new | mine
  const [selected, setSelected] = useState(null);
  const [types, setTypes] = useState([]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const loadMine = () => {
    setLoadingMine(true);
    getMyGuardReports().then((res) => setMine(res.data || [])).catch(() => setMine([])).finally(() => setLoadingMine(false));
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
      await createGuardReport({
        category: selected,
        reportType: types.join(', '),
        location: location || null,
        description: description || null,
      });
      alert('Report submitted. The admin has been notified.');
      setSelected(null); setTypes([]); setLocation(''); setDescription('');
      setTab('mine');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
        {/* Tabs */}
        <div className="flex gap-2 mt-5 mb-4">
          <button onClick={() => setTab('new')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
                  style={tab === 'new' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            New Report
          </button>
          <button onClick={() => setTab('mine')}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
                  style={tab === 'mine' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31' }}>
            My Reports
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
              return (
                <div key={r.report_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{r.category}</span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                          style={r.status === 'Acknowledged' ? { backgroundColor: '#B4E4BE', color: '#1e6b2e' } : { backgroundColor: '#F1D88A', color: '#8a6d12' }}>
                      {r.status}
                    </span>
                  </div>
                  <p className="font-semibold text-ink text-sm">{r.report_type}</p>
                  {r.location && <p className="text-xs text-ink/60 mt-0.5">📍 {r.location}</p>}
                  {r.description && <p className="text-xs text-ink/70 mt-1">{r.description}</p>}
                  <p className="text-[10px] text-ink/40 mt-2">{fmt(r.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GuardBottomNav active="home" />
    </div>
  );
}
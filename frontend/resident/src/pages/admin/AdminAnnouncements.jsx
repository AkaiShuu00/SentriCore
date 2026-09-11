import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api';

const statusBg = {
  Active:  { backgroundColor: '#F1D88A', color: '#8a6d12' },
  Expired: { backgroundColor: '#D9D9D9', color: '#555' },
};

const iconFor = (text) => {
  const t = (text || '').toLowerCase();
  if (t.includes('fire')) return '🔥';
  if (t.includes('water')) return '💧';
  if (t.includes('power') || t.includes('electric')) return '⚡';
  if (t.includes('gate') || t.includes('cctv') || t.includes('maintenance')) return '🛠️';
  if (t.includes('meeting') || t.includes('homeowner')) return '🧑';
  return '📢';
};

export default function AdminAnnouncements() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTab, setComposeTab] = useState('details');
  const [showSuccess, setShowSuccess] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Compose form state
  const [form, setForm] = useState({
    title: '', content: '', recipients: '', category: '', priority: '', startDate: '', endDate: '',
  });

  const load = () => {
    setLoading(true);
    getAnnouncements()
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ title: '', content: '', recipients: '', category: '', priority: '', startDate: '', endDate: '' });

  const openCompose = () => { resetForm(); setComposeTab('details'); setShowCompose(true); };

  const publish = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('Please fill in the title and details.');
      setComposeTab('details');
      return;
    }
    setSaving(true);
    try {
      await createAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        recipients: form.recipients || null,
        category: form.category || null,
        priority: form.priority || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      setShowCompose(false);
      setShowSuccess(true);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish announcement.');
    } finally {
      setSaving(false);
    }
  };

  const removeAnn = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setDetail(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const filtered = items.filter((a) => (a.title || '').toLowerCase().includes(search.toLowerCase()));
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—');

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Announcements</h1>
          <p className="text-sm text-ink/60">Manage community announcements for residents and guards</p>
        </div>
        <button onClick={openCompose}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          + Post Announcement
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-4 max-w-md">
        <span className="text-ink/40">🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search announcement"
               className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-ink text-white text-[11px] font-bold">
          <span>Title</span><span>Category</span><span>Status</span><span className="text-center">Action</span>
        </div>
        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-ink/50 py-10 text-sm">No announcements yet.</p>
        ) : (
          filtered.map((a) => (
            <div key={a.announcement_id} className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-semibold">{a.title}</span>
              <span className="text-ink/70">{a.category || '—'}</span>
              <span><span className="text-[9px] font-bold px-3 py-1 rounded-full" style={statusBg.Active}>Active</span></span>
              <span className="text-center">
                <button onClick={() => setDetail(a)} className="text-[11px] font-bold text-teal-700">View</button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Details modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-4">Details</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-white text-sm font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>{detail.category || 'General'}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full ml-auto" style={{ backgroundColor: '#B4E4BE', color: '#1e6b2e' }}>ACTIVE</span>
            </div>
            <p className="font-bold text-ink mb-1">{detail.title}</p>
            <div className="flex items-center justify-between mt-4 mb-1">
              <p className="text-xs font-bold text-ink/50">Message</p>
              {detail.priority && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#F3C9C9', color: '#8a2b2b' }}>{detail.priority}</span>}
            </div>
            <p className="text-sm text-ink/80 leading-relaxed border border-gray-200 rounded-xl p-4 mb-4">{detail.content}</p>
            <div className="flex gap-3 items-end">
              <div>
                <p className="text-[10px] font-bold text-ink/40">Start Date</p>
                <p className="text-sm font-semibold text-ink border border-gray-200 rounded-lg px-3 py-1.5">{fmtDate(detail.start_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-ink/40">End Date</p>
                <p className="text-sm font-semibold text-ink border border-gray-200 rounded-lg px-3 py-1.5">{fmtDate(detail.end_date)}</p>
              </div>
              <button onClick={() => removeAnn(detail.announcement_id)}
                      className="ml-auto text-white font-bold text-sm px-6 py-2.5 rounded-full" style={{ backgroundColor: '#C0392B' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal — EXACTLY as design */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowCompose(false)}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Dark header */}
            <div className="px-8 py-6 text-white relative" style={{ backgroundColor: '#0E2A2E' }}>
              <button onClick={() => setShowCompose(false)} className="absolute top-5 right-6 w-8 h-8 rounded-full border-2 border-white/60 flex items-center justify-center">✕</button>
              <h2 className="text-2xl font-extrabold">What would you like to communicate today?</h2>
              <p className="text-white/60 text-sm mt-1">Fill out the information below to get started.</p>
            </div>

            {/* Body */}
            <div className="bg-cream px-8 py-6" style={{ backgroundColor: '#F5F2E9' }}>
              {/* Tabs */}
              <div className="flex gap-3 mb-6">
                <button onClick={() => setComposeTab('details')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold ${composeTab === 'details' ? 'text-white' : 'bg-white text-ink'}`}
                        style={composeTab === 'details' ? { backgroundColor: '#0F6E6E' } : {}}>Announcement details</button>
                <button onClick={() => setComposeTab('privacy')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold ${composeTab === 'privacy' ? 'text-white' : 'bg-white text-ink'}`}
                        style={composeTab === 'privacy' ? { backgroundColor: '#0F6E6E' } : {}}>Privacy Options</button>
              </div>

              {composeTab === 'details' ? (
                <>
                  <label className="block text-sm font-bold text-ink mb-1">Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                         placeholder="Gate Maintenance"
                         className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 mb-5" />
                  <label className="block text-sm font-bold text-ink mb-1">Details</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                            rows={7} placeholder="Please be informed that the main gate will undergo maintenance..."
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 resize-none" />
                  <div className="flex justify-end mt-5">
                    <button onClick={() => setComposeTab('privacy')} className="text-white font-bold text-sm px-10 py-2.5 rounded-lg" style={{ backgroundColor: '#0F6E6E' }}>Next</button>
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-sm font-bold text-ink mb-1">Recipients</label>
                  <select value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-5">
                    <option value="">--</option>
                    <option value="All">All (Residents & Guards)</option>
                    <option value="Residents">Residents only</option>
                    <option value="Guards">Guards only</option>
                  </select>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-sm font-bold text-ink mb-1">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                        <option value="">Select a Category</option>
                        <option>Maintenance Advisory</option><option>Event</option><option>Emergency</option><option>General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-1">Priority Level</label>
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                        <option value="">Select a Priority Level</option>
                        <option>High Priority</option><option>Normal</option><option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-1">Start Date</label>
                      <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                             className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-1">End Date</label>
                      <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                             className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={publish} disabled={saving}
                            className="text-white font-bold text-sm px-10 py-2.5 rounded-lg disabled:opacity-60" style={{ backgroundColor: '#0F6E6E' }}>
                      {saving ? 'Publishing…' : 'Publish'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowSuccess(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">📣</div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Announcement Posted Successfully!</h2>
            <p className="text-sm text-ink/60 mb-6">Your announcement has been published.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSuccess(false)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Return to Home</button>
              <button onClick={() => setShowSuccess(false)} className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>View Announcement</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
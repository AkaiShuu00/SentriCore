import { useState } from 'react';
import AdminLayout from './components/AdminLayout';

// ── Sample data (iko-connect sa DB after) ──
const ANN = [
  { title: 'Gate Maintenance', category: 'Maintenance Advisory', status: 'Active', priority: 'High Priority',
    message: 'Please be informed that the main gate will undergo maintenance on May 30, 2025 from 9:00 AM to 12:00 NN. During this time, expect minor delays in entry and exit. We advise all residents and visitors to plan their schedules accordingly. Thank you for your understanding and cooperation.',
    start: 'May 30, 2025', end: 'June 3, 2025' },
];

const statusBg = {
  Active:  { backgroundColor: '#F1D88A', color: '#8a6d12' },
  Expired: { backgroundColor: '#D9D9D9', color: '#555' },
};

export default function AdminAnnouncements() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTab, setComposeTab] = useState('details');   // details | privacy
  const [showSuccess, setShowSuccess] = useState(false);

  const filtered = ANN.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Announcements</h1>
          <p className="text-sm text-ink/60">Manage community announcements for residents and guards</p>
        </div>
        <button onClick={() => { setComposeTab('details'); setShowCompose(true); }}
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
        <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-ink text-white text-[11px] font-bold rounded-t-2xl">
          <span>Title</span><span>Category</span><span>Status</span><span className="text-center">Action</span>
        </div>
        {filtered.map((a, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-gray-100 text-sm text-ink items-center">
            <span className="font-semibold">{a.title}</span>
            <span className="text-ink/70">{a.category}</span>
            <span><span className="text-[9px] font-bold px-3 py-1 rounded-full" style={statusBg[a.status]}>{a.status}</span></span>
            <span className="text-center">
              <button onClick={() => setDetail(a)} className="text-[11px] font-bold text-teal-700">View</button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-ink/50 py-10 text-sm">No announcements.</p>}
      </div>

      {/* Details modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-4">Details</h2>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-white text-sm font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>{detail.category}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full ml-auto" style={{ backgroundColor: '#B4E4BE', color: '#1e6b2e' }}>{detail.status.toUpperCase()}</span>
            </div>
            <p className="font-bold text-ink mb-1">{detail.title}</p>

            <div className="flex items-center justify-between mt-4 mb-1">
              <p className="text-xs font-bold text-ink/50">Message</p>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#F3C9C9', color: '#8a2b2b' }}>{detail.priority}</span>
            </div>
            <p className="text-sm text-ink/80 leading-relaxed border border-gray-200 rounded-xl p-4 mb-4">{detail.message}</p>

            <div className="flex gap-3 items-end">
              <div>
                <p className="text-[10px] font-bold text-ink/40">Start Date</p>
                <p className="text-sm font-semibold text-ink border border-gray-200 rounded-lg px-3 py-1.5">{detail.start}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-ink/40">End Date</p>
                <p className="text-sm font-semibold text-ink border border-gray-200 rounded-lg px-3 py-1.5">{detail.end}</p>
              </div>
              <button className="ml-auto text-white font-bold text-sm px-6 py-2.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowCompose(false)}>
          <div className="rounded-3xl w-full max-w-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            {/* Teal header */}
            <div className="p-6 text-white relative" style={{ background: 'linear-gradient(135deg,#0F5E5E,#1B6B63)' }}>
              <button onClick={() => setShowCompose(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">✕</button>
              <h2 className="text-2xl font-extrabold">What would you like to communicate today?</h2>
              <p className="text-white/70 text-sm">Fill out the information below to get started.</p>
            </div>

            <div className="bg-white p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-5">
                <button onClick={() => setComposeTab('details')}
                        className={`px-4 py-2 rounded-full text-xs font-bold ${composeTab === 'details' ? 'text-white' : 'bg-gray-100 text-ink'}`}
                        style={composeTab === 'details' ? { backgroundColor: '#0F6E6E' } : {}}>Announcement Details</button>
                <button onClick={() => setComposeTab('privacy')}
                        className={`px-4 py-2 rounded-full text-xs font-bold ${composeTab === 'privacy' ? 'text-white' : 'bg-gray-100 text-ink'}`}
                        style={composeTab === 'privacy' ? { backgroundColor: '#0F6E6E' } : {}}>Privacy Options</button>
              </div>

              {composeTab === 'details' ? (
                <>
                  <label className="block text-xs font-bold text-ink mb-1">Title</label>
                  <input placeholder="Gate Maintenance" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600 mb-4" />
                  <label className="block text-xs font-bold text-ink mb-1">Details</label>
                  <textarea rows={5} placeholder="Write your announcement..." className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 resize-none" />
                  <div className="flex justify-end mt-4">
                    <button onClick={() => setComposeTab('privacy')} className="text-white font-bold text-sm px-8 py-2.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Next</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-ink mb-1">Recipients</label>
                      <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
                        <option>All (Residents & Guards)</option><option>Residents only</option><option>Guards only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Category</label>
                      <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
                        <option>Select a Category</option><option>Maintenance Advisory</option><option>Event</option><option>Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Priority Level</label>
                      <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
                        <option>Select a Priority Level</option><option>High Priority</option><option>Normal</option><option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Start Date</label>
                      <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">End Date</label>
                      <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end mt-5">
                    <button onClick={() => { setShowCompose(false); setShowSuccess(true); }}
                            className="text-white font-bold text-sm px-8 py-2.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Publish</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowSuccess(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-3">📣</div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Announcement Posted Successfully!</h2>
            <p className="text-sm text-ink/60 mb-6">Your announcement has been published.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSuccess(false)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Return to Panel</button>
              <button onClick={() => setShowSuccess(false)} className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>View Announcement</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
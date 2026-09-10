import { useState } from 'react';
import AdminLayout from './components/AdminLayout';

// ── Sample data (iko-connect sa DB after) ──
const RESIDENTS = [
  { name: 'Juan Dela Cruz',   address: 'Unit B-12', contact: '0912 456 3857', active: 2,  total: 24 },
  { name: 'Reina Magpantay',  address: 'Unit C-8',  contact: '0956 395 7985', active: 0,  total: 40 },
  { name: 'Andrew Pumingas',  address: 'Unit C-13', contact: '0870 409 1236', active: 1,  total: 12 },
  { name: 'Marina Lewis',     address: 'Unit D-3',  contact: '0818 448 1968', active: 3,  total: 31 },
  { name: 'Chelsea Aary Grant', address: 'Unit A-6', contact: '0664 159 7569', active: 0, total: 8 },
  { name: 'Flip Macatlas',    address: 'Unit D-14', contact: '0644 154 2495', active: 1,  total: 17 },
  { name: 'Samu Curdo',       address: 'Unit B-10', contact: '0919 653 8895', active: 0,  total: 54 },
];

const ACTIVE_VISITORS_SAMPLE = {
  'Juan Dela Cruz': {
    unit: 'Unit B-12',
    visitors: [
      { name: 'Samantha Magpantay', entry: 'May 21, 3:05 AM', mode: 'Walk-in' },
      { name: 'Ace Pajido',         entry: 'May 21, 5:05 AM', mode: 'Private Vehicle' },
    ],
  },
};

export default function AdminResidents() {
  const [search, setSearch] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = RESIDENTS.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.address.toLowerCase().includes(search.toLowerCase())
  );

  const openActive = (r) => {
    const data = ACTIVE_VISITORS_SAMPLE[r.name] || { unit: r.address, visitors: [] };
    setActiveModal({ resident: r.name, ...data, activeCount: r.active });
  };

  return (
    <AdminLayout>
      {/* Title + Add */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Resident</h1>
          <p className="text-sm text-ink/60">Manage resident records and visitor associations</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          + Add Resident
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-4 max-w-md">
        <span className="text-ink/40">🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resident name or unit"
               className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-6 py-3 bg-gray-50 text-[11px] font-bold text-ink/60">
          <span>Resident Name</span><span>Address</span><span>Contact Number</span>
          <span className="text-center">Active Visitors</span><span className="text-center">Total Visitors</span>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          {filtered.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-6 py-4 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-semibold">{r.name}</span>
              <span className="text-ink/70">{r.address}</span>
              <span className="text-ink/70">{r.contact}</span>
              <span className="text-center">
                <button onClick={() => openActive(r)}
                        className="text-[11px] font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: '#F1D88A', color: '#8a6d12' }}>
                  View
                </button>
              </span>
              <span className="text-center font-bold text-ink">{r.total}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-ink/50 py-10 text-sm">No residents found.</p>}
        </div>
      </div>

      {/* Active Visitors modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-4">Active Visitors</h2>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-white text-sm font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>{activeModal.resident}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full ml-auto" style={{ backgroundColor: '#F1D88A', color: '#8a6d12' }}>Total Active: {activeModal.activeCount}</span>
            </div>
            <p className="text-xs text-ink/50 mb-4">{activeModal.unit}</p>

            <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-gray-50 rounded-xl text-[11px] font-bold text-ink/60 mb-2">
              <span>Names</span><span>Entry Date</span><span>Mode of Arrival</span>
            </div>
            {activeModal.visitors.length === 0 ? (
              <p className="text-center text-ink/50 py-6 text-sm">No active visitors.</p>
            ) : (
              activeModal.visitors.map((v, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 px-3 py-3 border-b border-gray-100 text-sm text-ink">
                  <span className="font-semibold">{v.name}</span>
                  <span className="text-ink/70">{v.entry}</span>
                  <span className="text-ink/70">{v.mode}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Resident modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-5">Add Resident</h2>

            <div className="space-y-3">
              {[
                ['Full Name', 'Juan Dela Cruz'],
                ['Unit / Address', 'Unit B-12'],
                ['Contact Number', '0912 345 6789'],
                ['Email Address', 'resident@email.com'],
                ['Username', 'resident1'],
                ['Temporary Password', '••••••••'],
              ].map(([label, ph]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-ink mb-1">{label}</label>
                  <input placeholder={ph} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
              <button onClick={() => { alert('Resident added — iko-connect sa DB'); setShowAdd(false); }}
                      className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>Add Resident</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
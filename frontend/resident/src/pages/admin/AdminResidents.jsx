import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import {
  adminListResidents, adminResidentActive, adminAddResident,
  adminUpdateResident, adminResetResidentPassword,
} from '../../api';

export default function AdminResidents() {
  const [search, setSearch] = useState('');
  const [sortAZ, setSortAZ] = useState(false);
  const [areaFilter, setAreaFilter] = useState('All Areas');

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [credModal, setCredModal] = useState(null); // ipinapakitang generated credentials

  const load = () => {
    setLoading(true);
    adminListResidents()
      .then((res) => setResidents(res.data || []))
      .catch(() => setResidents([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Kunin ang "area" mula address — unang salita/block (hal. "Unit B-12" → "B", "Block 1 Lot 1" → "Block 1")
  const areaOf = (addr) => {
    if (!addr) return 'Other';
    const block = addr.match(/Block\s+([A-Za-z0-9]+)/i);
    if (block) return `Block ${block[1]}`;
    const unit = addr.match(/Unit\s+([A-Za-z])/i);
    if (unit) return `Unit ${unit[1]}`;
    return addr.split(/[\s-]/)[0] || 'Other';
  };
  const areas = ['All Areas', ...Array.from(new Set(residents.map((r) => areaOf(r.address))))];

  let list = residents
    .filter((r) => areaFilter === 'All Areas' || areaOf(r.address) === areaFilter)
    .filter((r) => (r.fullName || '').toLowerCase().includes(search.toLowerCase())
                || (r.address || '').toLowerCase().includes(search.toLowerCase()));
  if (sortAZ) list = [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));

  const openActive = (r) => {
    adminResidentActive(r.residentId)
      .then((res) => setActiveModal(res.data))
      .catch(() => setActiveModal({ resident: r.fullName, unit: r.address, activeCount: 0, visitors: [] }));
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-800">Resident</h1>
          <p className="text-sm text-ink/60">Manage resident records and visitor associations.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          + Add Resident
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Search + filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, resident..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>
          <button onClick={() => setSortAZ((v) => !v)}
                  className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${sortAZ ? 'text-white' : 'bg-white border border-gray-200 text-ink'}`}
                  style={sortAZ ? { backgroundColor: '#0F6E6E' } : {}}>
            A–Z
          </button>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-ink outline-none">
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>

        {/* Header */}
        <div className="grid grid-cols-6 gap-2 px-2 mb-2">
          {['Resident Name', 'Address', 'Contact Number', 'Active Visitors', 'Total Visitors', ''].map((h, i) => (
            <span key={i} className={`text-[11px] font-bold text-white px-3 py-2 rounded-lg text-center ${i === 5 ? 'bg-transparent' : ''}`}
                  style={i === 5 ? {} : { backgroundColor: '#3a4a4a' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="max-h-[58vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-ink/50 py-10 text-sm">Loading residents…</p>
          ) : list.length === 0 ? (
            <p className="text-center text-ink/50 py-10 text-sm">No residents found.</p>
          ) : list.map((r) => (
            <div key={r.residentId} className="grid grid-cols-6 gap-2 px-2 py-3 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-semibold">{r.fullName}</span>
              <span className="text-ink/70">{r.address}</span>
              <span className="text-ink/70">{r.contact || '—'}</span>
              <span className="text-center">
                <button onClick={() => openActive(r)}
                        className="text-[11px] font-bold px-6 py-1.5 rounded-full" style={{ backgroundColor: '#F1C542', color: '#5a4a12' }}>
                  View
                </button>
              </span>
              <span className="text-center font-bold">{r.monthlyVisitors}</span>
              <span className="text-center">
                <button onClick={() => setEditModal({ ...r })} title="Edit / Settings"
                        className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink">⚙️</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Visitors modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center">✕</button>
            <h2 className="text-2xl font-extrabold text-ink mb-5">Active Visitors</h2>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-white text-sm font-bold px-5 py-2 rounded-lg" style={{ backgroundColor: '#0F6E6E' }}>{activeModal.resident}</span>
                <p className="text-sm font-bold text-teal-700 mt-2">{activeModal.unit}</p>
              </div>
              <span className="text-xs font-bold px-4 py-2 rounded-lg" style={{ backgroundColor: '#F1C542', color: '#5a4a12' }}>Total Active/s: {activeModal.activeCount}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {['Names', 'Entry Date', 'Mode of Arrival'].map((h) => (
                <span key={h} className="text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
              ))}
            </div>
            {activeModal.visitors.length === 0 ? (
              <p className="text-center text-ink/50 py-8 text-sm">No active visitors.</p>
            ) : activeModal.visitors.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink">
                <span className="font-semibold">{v.name}</span>
                <span className="text-ink/70">{fmt(v.entry)}</span>
                <span className="text-ink/70">{v.mode}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Resident modal */}
      {showAdd && <ResidentForm title="Add Resident" onClose={() => setShowAdd(false)}
        onSubmit={async (data) => {
          try {
            const res = await adminAddResident(data);
            setShowAdd(false);
            setCredModal(res.data.credentials); // ipakita ang generated username+password
            load();
          } catch (err) { alert(err.response?.data?.message || 'Failed to add resident.'); }
        }} />}

      {/* Edit Resident modal */}
      {editModal && <ResidentForm title="Edit Resident" initial={editModal} showReset
        onClose={() => setEditModal(null)}
        onReset={async () => {
          if (!window.confirm('Reset this resident\'s password? Their records stay intact.')) return;
          try {
            const res = await adminResetResidentPassword(editModal.residentId);
            setEditModal(null);
            setCredModal({ username: editModal.username, password: res.data.password });
          } catch (err) { alert(err.response?.data?.message || 'Failed to reset password.'); }
        }}
        onSubmit={async (data) => {
          try {
            await adminUpdateResident(editModal.residentId, data);
            setEditModal(null);
            load();
          } catch (err) { alert(err.response?.data?.message || 'Failed to update.'); }
        }} />}

      {/* Generated credentials modal */}
      {credModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setCredModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Login Credentials</h2>
            <p className="text-sm text-ink/60 mb-4">Ibigay ito sa resident. Ipakita lang isang beses.</p>
            <div className="bg-cream rounded-xl p-4 mb-5 text-left" style={{ backgroundColor: '#F5F2E9' }}>
              <p className="text-xs font-bold text-ink/50">Username</p>
              <p className="text-base font-extrabold text-teal-800 mb-2">{credModal.username}</p>
              <p className="text-xs font-bold text-ink/50">Temporary Password</p>
              <p className="text-base font-extrabold text-teal-800">{credModal.password}</p>
            </div>
            <button onClick={() => {
                      navigator.clipboard?.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
                      setCredModal(null);
                    }}
                    className="w-full text-white font-bold py-3 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Reusable Add/Edit form ──
function ResidentForm({ title, initial, showReset, onClose, onSubmit, onReset }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    address: initial?.address || '',
    contact: initial?.contact || '',
    email: initial?.email || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
        <h2 className="text-xl font-extrabold text-ink mb-1">{title}</h2>
        {!initial && <p className="text-xs text-ink/60 mb-4">Ang username at password ay awtomatikong gagawin.</p>}
        {initial && <p className="text-xs text-ink/60 mb-4">Username: <span className="font-bold">{initial.username}</span></p>}

        <div className="space-y-3 mt-2">
          {[
            ['Full Name', 'fullName', 'Juan Dela Cruz'],
            ['Unit / Address', 'address', 'Unit B-12'],
            ['Contact Number', 'contact', '0912 345 6789'],
            ['Email Address', 'email', 'resident@email.com'],
          ].map(([label, key, ph]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-ink mb-1">{label}</label>
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                     placeholder={ph} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          ))}
        </div>

        {showReset && (
          <button onClick={onReset} className="w-full mt-4 py-2.5 rounded-full border border-amber-400 text-amber-700 font-bold text-sm bg-amber-50">
            🔑 Reset Password (records stay intact)
          </button>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
          <button onClick={() => {
                    if (!form.fullName.trim() || !form.address.trim()) { alert('Full name and address are required.'); return; }
                    onSubmit(form);
                  }}
                  className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>
            {initial ? 'Save Changes' : 'Add Resident'}
          </button>
        </div>
      </div>
    </div>
  );
}
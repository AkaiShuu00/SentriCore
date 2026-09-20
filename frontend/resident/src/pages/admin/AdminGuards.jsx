import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import { Search, Settings, X, KeyRound, Trash2, Plus } from 'lucide-react';
import {
  adminListGuards, adminAddGuard, adminUpdateGuard,
  adminAssignGate, adminResetGuardPassword, adminDeleteGuard,
} from '../../api';

const dutyBg = (s) => {
  const v = (s || '').toLowerCase();
  if (v.includes('on')) return { backgroundColor: '#2ea44f', color: '#fff' };   // On Duty
  if (v.includes('break')) return { backgroundColor: '#F1C542', color: '#5a4a12' };
  return { backgroundColor: '#B7B7B7', color: '#fff' };                          // Off Duty
};

const GATE_LABEL = (id) => (id ? `GATE ${String(id).toUpperCase()}` : 'UNASSIGNED');

export default function AdminGuards() {
  const [search, setSearch] = useState('');
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [credModal, setCredModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  const load = () => {
    setLoading(true);
    adminListGuards()
      .then((res) => setGuards(res.data || []))
      .catch(() => setGuards([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const match = (g) => g.fullName.toLowerCase().includes(search.toLowerCase());

  // Buuin ang listahan ng gates: distinct gateId na meron + laging Gate 1 & 2, at Unassigned kung kailangan
  const gateIds = Array.from(new Set(guards.map((g) => g.gateId).filter((x) => x != null)));
  ['1', '2'].forEach((d) => { if (!gateIds.map(String).includes(d)) gateIds.push(d); });
  gateIds.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const hasUnassigned = guards.some((g) => g.gateId == null);

  const toggleDuty = async (g) => {
    const next = (g.status || '').toLowerCase().includes('on') ? 'Off Duty' : 'On Duty';
    try {
      await adminUpdateGuard(g.guardId, { fullName: g.fullName, gateId: g.gateId, shift: g.shift === '—' ? '' : g.shift, status: next });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed to update duty.'); }
  };

  const GateCard = ({ gateId }) => {
    const list = guards.filter((g) => String(g.gateId ?? '') === String(gateId ?? '') && match(g));
    return (
      <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#EFEBDD' }}>
          <span className="font-extrabold text-ink">{GATE_LABEL(gateId)}</span>
          <button onClick={() => setAssignModal({ gateId })}
                  className="flex items-center gap-1 text-white text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
            <Plus size={14} /> Assign Guard
          </button>
        </div>
        <div className="p-4 min-h-[160px]">
          {list.length === 0 ? (
            <p className="text-center text-ink/40 py-8 text-sm">No guards assigned.</p>
          ) : list.map((g, i) => (
            <div key={g.guardId}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold text-ink">{g.fullName}</p>
                  <p className="text-xs text-ink/60">{g.shift && g.shift !== '—' ? g.shift : 'No shift set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleDuty(g)} title="Toggle duty"
                          className="text-[10px] font-bold px-4 py-1.5 rounded-full" style={dutyBg(g.status)}>
                    {(g.status || 'Off Duty').replace(' ', '-')}
                  </button>
                  <button onClick={() => setEditModal({ ...g })} title="Edit"
                          className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink"><Settings size={16} /></button>
                </div>
              </div>
              {i < list.length - 1 && <div className="border-b border-gray-100" />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-800">Guards</h1>
          <p className="text-sm text-ink/60">Gate assignments, shifts, and guard accounts.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          <Plus size={16} /> Add Guard
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-full px-4 py-2 mb-5 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
        <Search size={18} className="text-ink/40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, resident..."
               className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
      </div>

      {loading ? (
        <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {gateIds.map((id) => <GateCard key={id} gateId={id} />)}
          {hasUnassigned && <GateCard gateId={null} />}
        </div>
      )}

      {/* Add Guard */}
      {showAdd && <GuardForm title="Add Guard"
        onClose={() => setShowAdd(false)}
        onSubmit={async (data) => {
          try { const res = await adminAddGuard(data); setShowAdd(false); setCredModal(res.data.credentials); load(); }
          catch (err) { alert(err.response?.data?.message || 'Failed to add guard.'); }
        }} />}

      {/* Edit Guard */}
      {editModal && <GuardForm title="Edit Guard" initial={editModal} showManage
        onClose={() => setEditModal(null)}
        onReset={async () => {
          if (!window.confirm("Reset this guard's password?")) return;
          try { const res = await adminResetGuardPassword(editModal.guardId); setEditModal(null); setCredModal({ username: editModal.username, password: res.data.password }); }
          catch (err) { alert(err.response?.data?.message || 'Failed to reset.'); }
        }}
        onDelete={async () => {
          if (!window.confirm('Delete this guard and their account? This cannot be undone.')) return;
          try { await adminDeleteGuard(editModal.guardId); setEditModal(null); load(); }
          catch (err) { alert(err.response?.data?.message || 'Failed to delete.'); }
        }}
        onSubmit={async (data) => {
          try { await adminUpdateGuard(editModal.guardId, data); setEditModal(null); load(); }
          catch (err) { alert(err.response?.data?.message || 'Failed to update.'); }
        }} />}

      {/* Assign gate modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAssignModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h2 className="text-xl font-extrabold text-ink mb-1">Assign to {GATE_LABEL(assignModal.gateId)}</h2>
            <p className="text-xs text-ink/60 mb-4">Piliin ang guard na ilalagay sa gate na ito.</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {guards.length === 0 ? (
                <p className="text-center text-ink/50 py-6 text-sm">No guards yet.</p>
              ) : guards.map((g) => (
                <button key={g.guardId}
                        onClick={async () => {
                          try { await adminAssignGate(g.guardId, assignModal.gateId); setAssignModal(null); load(); }
                          catch (err) { alert(err.response?.data?.message || 'Failed to assign.'); }
                        }}
                        className="w-full text-left rounded-xl p-3 border border-gray-200 hover:border-teal-500 flex items-center justify-between">
                  <span className="font-semibold text-ink text-sm">{g.fullName}</span>
                  <span className="text-xs text-ink/50">Currently: {g.gate}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {credModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setCredModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4"><KeyRound size={30} className="text-teal-700" /></div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Guard Login Credentials</h2>
            <p className="text-sm text-ink/60 mb-4">Ibigay ito sa guard. Ipakita lang isang beses.</p>
            <div className="rounded-xl p-4 mb-5 text-left" style={{ backgroundColor: '#F5F2E9' }}>
              <p className="text-xs font-bold text-ink/50">Username</p>
              <p className="text-base font-extrabold text-teal-800 mb-2">{credModal.username}</p>
              <p className="text-xs font-bold text-ink/50">Temporary Password</p>
              <p className="text-base font-extrabold text-teal-800">{credModal.password}</p>
            </div>
            <button onClick={() => {
                      navigator.clipboard?.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
                      setCredModal(null);
                    }}
                    className="w-full text-white font-bold py-3 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Copy & Close</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Reusable Add/Edit form ──
function GuardForm({ title, initial, showManage, onClose, onSubmit, onReset, onDelete }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    gateId: initial?.gateId ?? '',
    shift: initial?.shift && initial.shift !== '—' ? initial.shift : '',
    status: initial?.status || 'Off Duty',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
        <h2 className="text-xl font-extrabold text-ink mb-1">{title}</h2>
        {!initial && <p className="text-xs text-ink/60 mb-4">Ang username at password ay awtomatikong gagawin.</p>}
        {initial && <p className="text-xs text-ink/60 mb-4">Username: <span className="font-bold">{initial.username}</span></p>}

        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Full Name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                   placeholder="Carlos Aquino" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Gate Assignment</label>
              <select value={form.gateId} onChange={(e) => setForm({ ...form, gateId: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
                <option value="">Select Gate</option>
                <option value="1">Gate 1</option><option value="2">Gate 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Shift Schedule</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
                <option value="">Select Shift</option>
                <option value="6:00 AM - 6:00 PM">6:00 AM - 6:00 PM</option>
                <option value="6:00 PM - 6:00 AM">6:00 PM - 6:00 AM</option>
              </select>
            </div>
          </div>
          {initial && (
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Duty Status</label>
              <div className="flex gap-2">
                {['On Duty', 'Off Duty'].map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
                          className="flex-1 py-2 rounded-full text-xs font-bold border-2"
                          style={form.status === s ? { ...dutyBg(s), borderColor: 'transparent' } : { borderColor: '#e5e7eb', color: '#112D31' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showManage && (
          <div className="flex gap-2 mt-4">
            <button onClick={onReset} className="flex-1 py-2.5 rounded-full border border-amber-400 text-amber-700 font-bold text-xs bg-amber-50 flex items-center justify-center gap-1"><KeyRound size={14} /> Reset Password</button>
            <button onClick={onDelete} className="flex-1 py-2.5 rounded-full border border-red-300 text-red-700 font-bold text-xs bg-red-50 flex items-center justify-center gap-1"><Trash2 size={14} /> Delete Guard</button>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
          <button onClick={() => {
                    if (!form.fullName.trim()) { alert('Full name is required.'); return; }
                    onSubmit(form);
                  }}
                  className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>
            {initial ? 'Save Changes' : 'Add Guard'}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import {
  adminListGuards, adminGuardActivity, adminAddGuard, adminUpdateGuard,
  adminAssignGate, adminResetGuardPassword, adminDeleteGuard,
} from '../../api';

const TABS = ['Guard List', 'Activity Logs', 'Schedule'];

const statusBg = {
  'On Duty':  { backgroundColor: '#2ea44f', color: '#fff' },
  'ON DUTY':  { backgroundColor: '#2ea44f', color: '#fff' },
  'Off Duty': { backgroundColor: '#B7B7B7', color: '#fff' },
  'OFF DUTY': { backgroundColor: '#B7B7B7', color: '#fff' },
  'On Break': { backgroundColor: '#F1C542', color: '#5a4a12' },
};

const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function AdminGuards() {
  const [tab, setTab] = useState('Guard List');
  const [search, setSearch] = useState('');
  const [guards, setGuards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [credModal, setCredModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminListGuards().then((res) => setGuards(res.data || [])).catch(() => setGuards([])),
      adminGuardActivity().then((res) => setActivity(res.data || [])).catch(() => setActivity([])),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filteredGuards = guards.filter((g) => g.fullName.toLowerCase().includes(search.toLowerCase()));

  // Group guards by gate para sa Schedule tab
  const gates = Array.from(new Set(guards.map((g) => g.gate).filter((x) => x && x !== '—')));
  if (gates.length === 0) gates.push('Gate 1', 'Gate 2');

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-800">Guards</h1>
          <p className="text-sm text-ink/60">Security personnel management.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          + Add Guard
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Search + tabs */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, resident..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-2 rounded-full text-sm font-bold ${tab === t ? 'text-white' : 'bg-white border border-gray-200 text-ink'}`}
                    style={tab === t ? { backgroundColor: '#0F6E6E' } : {}}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : (
          <>
            {/* GUARD LIST */}
            {tab === 'Guard List' && (
              <>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {['Guard Name', 'Shift Schedule', 'Gate Assignment', 'Status', ''].map((h, i) => (
                    <span key={i} className={`text-[11px] font-bold text-white px-3 py-2 rounded-lg ${i >= 2 ? 'text-center' : ''}`}
                          style={i === 4 ? { backgroundColor: 'transparent' } : { backgroundColor: '#3a4a4a' }}>{h}</span>
                  ))}
                </div>
                {filteredGuards.length === 0 ? (
                  <p className="text-center text-ink/50 py-10 text-sm">No guards yet.</p>
                ) : filteredGuards.map((g) => (
                  <div key={g.guardId} className="grid grid-cols-5 gap-2 px-2 py-3 border-b border-gray-100 text-sm text-ink items-center">
                    <span className="font-semibold">{g.fullName}</span>
                    <span className="text-ink/70">{g.shift}</span>
                    <span className="text-center text-ink/70">{g.gate}</span>
                    <span className="text-center">
                      <span className="text-[10px] font-bold px-4 py-1.5 rounded-full" style={statusBg[g.status] || statusBg['Off Duty']}>{g.status}</span>
                    </span>
                    <span className="text-center">
                      <button onClick={() => setEditModal({ ...g })} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center text-ink" title="Edit">⚙️</button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* ACTIVITY LOGS */}
            {tab === 'Activity Logs' && (
              <>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {['Guard Name', 'Date and Time', 'Visitor Name', 'Unit No.', 'Pass No.', 'Action'].map((h, i) => (
                    <span key={i} className={`text-[11px] font-bold text-white px-3 py-2 rounded-lg ${i === 5 ? 'text-center' : ''}`}
                          style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
                  ))}
                </div>
                {activity.length === 0 ? (
                  <p className="text-center text-ink/50 py-10 text-sm">No activity yet.</p>
                ) : activity.filter((a) => a.guard.toLowerCase().includes(search.toLowerCase())).map((a, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 px-2 py-3 border-b border-gray-100 text-sm text-ink items-center">
                    <span className="font-semibold">{a.guard}</span>
                    <span className="text-ink/70">{fmt(a.datetime)}</span>
                    <span className="text-ink/70">{a.visitor}</span>
                    <span className="text-ink/70">{a.unit}</span>
                    <span className="font-bold">{a.pass}</span>
                    <span className="text-center">
                      <span className="text-[10px] font-bold px-4 py-1.5 rounded-full"
                            style={a.action === 'Entry' ? { backgroundColor: '#F1C542', color: '#5a4a12' } : { backgroundColor: '#F3C9C9', color: '#8a2b2b' }}>
                        {a.action}
                      </span>
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* SCHEDULE */}
            {tab === 'Schedule' && (
              <div className="grid grid-cols-2 gap-6">
                {gates.map((gate) => (
                  <div key={gate} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="text-white font-bold px-4 py-2.5" style={{ backgroundColor: '#3a4a4a' }}>{gate.toUpperCase()}</div>
                    <div className="p-4">
                      <div className="flex justify-end mb-3">
                        <button onClick={() => setAssignModal({ gate })}
                                className="flex items-center gap-1 text-white text-xs font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
                          + Assign Guard
                        </button>
                      </div>
                      {guards.filter((g) => g.gate === gate).length === 0 ? (
                        <p className="text-center text-ink/40 py-6 text-sm">No guards assigned.</p>
                      ) : guards.filter((g) => g.gate === gate).map((g) => (
                        <div key={g.guardId} className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-bold text-ink">{g.fullName}</p>
                            <p className="text-xs text-ink/60">{g.shift}</p>
                          </div>
                          <span className="text-[10px] font-bold px-4 py-1.5 rounded-full" style={statusBg[g.status] || statusBg['Off Duty']}>{g.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Guard */}
      {showAdd && <GuardForm title="Add Guard"
        onClose={() => setShowAdd(false)}
        onSubmit={async (data) => {
          try {
            const res = await adminAddGuard(data);
            setShowAdd(false); setCredModal(res.data.credentials); load();
          } catch (err) { alert(err.response?.data?.message || 'Failed to add guard.'); }
        }} />}

      {/* Edit Guard */}
      {editModal && <GuardForm title="Edit Guard" initial={editModal} showManage
        onClose={() => setEditModal(null)}
        onReset={async () => {
          if (!window.confirm('Reset this guard\'s password?')) return;
          try { const res = await adminResetGuardPassword(editModal.guardId); setEditModal(null); setCredModal({ username: editModal.username, password: res.data.password }); }
          catch (err) { alert(err.response?.data?.message || 'Failed to reset.'); }
        }}
        onDelete={async () => {
          if (!window.confirm('Delete this guard and their account? This cannot be undone.')) return;
          try { await adminDeleteGuard(editModal.guardId); setEditModal(null); load(); }
          catch (err) { alert(err.response?.data?.message || 'Failed to delete.'); }
        }}
        onSubmit={async (data) => {
          try { await adminUpdateGuard(editModal.guardId, { ...data, status: editModal.status }); setEditModal(null); load(); }
          catch (err) { alert(err.response?.data?.message || 'Failed to update.'); }
        }} />}

      {/* Assign gate modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAssignModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-1">Assign Guard to {assignModal.gate}</h2>
            <p className="text-xs text-ink/60 mb-4">Ang guard ay malilipat sa gate na ito.</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {guards.map((g) => (
                <button key={g.guardId}
                        onClick={async () => {
                          const gateId = assignModal.gate.replace(/\D/g, '') || null;
                          try { await adminAssignGate(g.guardId, gateId); setAssignModal(null); load(); }
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
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Guard Login Credentials</h2>
            <p className="text-sm text-ink/60 mb-4">Ibigay ito sa guard. Ipakita lang isang beses.</p>
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
    gateId: initial?.gateId || '',
    shift: initial?.shift && initial.shift !== '—' ? initial.shift : '',
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
              <input value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                     placeholder="6:00 AM - 2:00 PM" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          </div>
        </div>

        {showManage && (
          <div className="flex gap-2 mt-4">
            <button onClick={onReset} className="flex-1 py-2.5 rounded-full border border-amber-400 text-amber-700 font-bold text-xs bg-amber-50">🔑 Reset Password</button>
            <button onClick={onDelete} className="flex-1 py-2.5 rounded-full border border-red-300 text-red-700 font-bold text-xs bg-red-50">🗑 Delete Guard</button>
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
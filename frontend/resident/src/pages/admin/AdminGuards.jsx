import { useState, useEffect, useRef } from 'react';
import AdminLayout from './components/AdminLayout';
import { Settings, X, KeyRound, Trash2, Plus, User, Camera, FileDown, FileSpreadsheet, Phone, Mail, Clock, ClipboardList, ChevronLeft } from 'lucide-react';
import {
  adminListGuards, adminAddGuard, adminUpdateGuard,
  adminResetGuardPassword, adminDeleteGuard, adminGuardShifts, getAllVisitorLogs,
} from '../../api';
import { exportExcel, exportPDF } from '../../utils/exportUtils';
import VisitorLogsPanel from './components/VisitorLogsPanel';

const fmtDT = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const fmtDateOnly = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTimeOnly = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
const fmtLog = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-----';
const toLocalISO = (ts) => { if (!ts) return ''; const d = new Date(ts); if (isNaN(d)) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

function Avatar({ src, size = 40 }) {
  return (
    <div className="rounded-full bg-teal-100 flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <User size={Math.round(size * 0.5)} className="text-ink" />}
    </div>
  );
}

const fileToSquare = (file, max = 320) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const dim = Math.min(side, max);
      const canvas = document.createElement('canvas');
      canvas.width = dim; canvas.height = dim;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

export default function AdminGuards() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [credModal, setCredModal] = useState(null);
  const [detail, setDetail] = useState(null); // guard detail screen

  const load = () => {
    setLoading(true);
    adminListGuards().then((res) => setGuards(res.data || [])).catch(() => setGuards([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const EXPORT_HEADER = ['Full Name', 'Username', 'Shift', 'Contact', 'Email'];
  const exportRows = () => guards.map((g) => [g.fullName, g.username, (g.shift && g.shift !== '—') ? g.shift : 'No shift set', g.contact || '—', g.email || '—']);
  const doExcel = () => exportExcel('guard-roster', 'Guards', EXPORT_HEADER, exportRows());
  const doPDF = () => exportPDF('Guard Roster', EXPORT_HEADER, exportRows(), { subtitle: 'Shifts and guard accounts' });

  return (
    <AdminLayout>
      {/* Guard detail screen */}
      {detail ? (
        <GuardDetail guard={detail} onBack={() => setDetail(null)} onEdit={() => { const g = detail; setDetail(null); setEditModal({ ...g }); }} />
      ) : (<>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-teal-800">Guards</h1>
            <p className="text-sm text-ink/60">Shifts, time records, and guard accounts.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={doPDF} className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm text-sm font-medium text-ink whitespace-nowrap"><FileDown size={16} /> Export PDF</button>
            <button onClick={doExcel} className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm text-sm font-medium text-ink whitespace-nowrap"><FileSpreadsheet size={16} /> Export Excel</button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              <Plus size={16} /> Add Guard
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-ink/50 py-10 text-sm">Loading…</p>
        ) : guards.length === 0 ? (
          <p className="text-center text-ink/50 py-10 text-sm">No guards yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {guards.map((g) => (
              <button key={g.guardId} onClick={() => setDetail(g)}
                      className="flex items-center gap-4 rounded-2xl border border-gray-100 shadow-sm p-4 bg-white text-left hover:shadow-md transition">
                <Avatar src={g.photo} size={60} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink text-base truncate">{g.fullName}</p>
                  <p className="text-sm text-ink/70 truncate">{g.shift && g.shift !== '—' ? g.shift : 'No shift set'}</p>
                  <p className="text-xs text-ink/45 truncate">{g.username}</p>
                  {g.contact && <p className="text-xs text-ink/45 truncate inline-flex items-center gap-1"><Phone size={11} className="text-ink/40" /> {g.contact}</p>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditModal({ ...g }); }} title="Edit"
                        className="w-10 h-10 rounded-full hover:bg-cream flex items-center justify-center text-ink shrink-0"><Settings size={18} /></button>
              </button>
            ))}
          </div>
        )}
      </>)}

      {/* Add Guard */}
      {showAdd && <GuardForm title="Add Guard" onClose={() => setShowAdd(false)}
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

      {/* Credentials modal */}
      {credModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setCredModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4"><KeyRound size={30} className="text-teal-700" /></div>
            <h2 className="text-lg font-extrabold text-ink mb-1">Guard Login Credentials</h2>
            <p className="text-sm text-ink/60 mb-4">Ibigay ito sa guard. Ipakita lang isang beses.</p>
            <div className="rounded-xl p-4 mb-5 text-left" style={{ backgroundColor: '#F5F2E9' }}>
              <p className="text-xs font-semibold text-ink/50">Username</p>
              <p className="text-base font-bold text-teal-800 mb-2">{credModal.username}</p>
              <p className="text-xs font-semibold text-ink/50">Temporary Password</p>
              <p className="text-base font-bold text-teal-800">{credModal.password}</p>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`); setCredModal(null); }}
                    className="w-full text-white font-semibold py-3 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>Copy & Close</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Guard detail screen: header + Time Records / History Logs ──
function GuardDetail({ guard, onBack, onEdit }) {
  const [tab, setTab] = useState('time'); // time | logs
  const [shifts, setShifts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminGuardShifts().then((r) => (r.data || []).filter((s) => String(s.guard_id) === String(guard.guardId))).catch(() => []),
      getAllVisitorLogs().then((r) => (r.data || []).filter((t) => String(t.guard_id) === String(guard.guardId))).catch(() => []),
    ]).then(([sh, lg]) => {
      setShifts(sh);
      setLogs(lg.map((t) => ({
        id: t.transaction_id, visitor: t.visitor_name, type: t.visitor_type || 'Visitor',
        resident: t.resident_name || '', unit: t.unit_address || '',
        entry: fmtLog(t.entry_time), exit: fmtLog(t.exit_time),
        status: t.status === 'Completed' ? 'Departed' : t.status, rawStatus: t.status,
        pass: t.pass_number || `P-${t.transaction_id}`, purpose: t.purpose || '—',
        regType: t.registration_type || 'Single', batchName: t.batch_name || '', regId: t.registration_id || null, plate: t.plate_number || '',
        kind: (t.visitor_type || 'Visitor').toLowerCase(), arrivalId: t.arrival_id || null,
        entryTime: t.entry_time || null, exitTime: t.exit_time || null, dateISO: toLocalISO(t.entry_time || t.exit_time),
      })));
    }).finally(() => setLoading(false));
  }, [guard.guardId]);

  const shiftRows = () => shifts.map((s) => [fmtDateOnly(s.time_in), fmtTimeOnly(s.time_in), s.ended_at ? fmtTimeOnly(s.ended_at) : '—', s.ended_at ? 'Ended' : 'On Duty']);
  const SHIFT_HEADER = ['Date', 'Time In', 'Time Out', 'Status'];
  const exportShiftPDF = () => exportPDF(`Shift Schedule — ${guard.fullName}`, SHIFT_HEADER, shiftRows(), { subtitle: guard.shift || '' });
  const exportShiftExcel = () => exportExcel('guard-shift-schedule', 'Shifts', SHIFT_HEADER, shiftRows());
  const exportLogsPDF = (base) => {
    const header = ['Visitor', 'Type', 'Reg Type', 'Resident', 'Entry', 'Exit', 'Status', 'Pass'];
    const rows = base.map((l) => [l.visitor, l.type, l.regType, l.resident, l.entry, l.exit, l.status, l.pass]);
    exportPDF(`Processed Entries — ${guard.fullName}`, header, rows, { subtitle: 'Guard history logs' });
  };
  const exportLogsExcel = (base) => {
    const header = ['Visitor', 'Type', 'Reg Type', 'Resident', 'Entry', 'Exit', 'Status', 'Pass'];
    const rows = base.map((l) => [l.visitor, l.type, l.regType, l.resident, l.entry, l.exit, l.status, l.pass]);
    exportExcel('guard-processed-entries', 'Processed', header, rows);
  };

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 mb-4"><ChevronLeft size={18} /> Back to Guards</button>

      {/* Header card */}
      <div className="rounded-3xl p-6 shadow-md text-white mb-5" style={{ background: 'linear-gradient(135deg,#0F6E6E 0%,#0A4A4A 100%)' }}>
        <div className="flex items-center gap-4">
          <Avatar src={guard.photo} size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-extrabold truncate">{guard.fullName}</p>
            <p className="text-sm text-white/80">{guard.username}</p>
          </div>
          <button onClick={onEdit} className="bg-white/20 rounded-full px-4 py-2 text-sm font-bold inline-flex items-center gap-1"><Settings size={15} /> Edit</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            ['Guard Name', guard.fullName],
            ['Shift', guard.shift && guard.shift !== '—' ? guard.shift : 'No shift set'],
            ['Contact Number', guard.contact || '—'],
            ['Email', guard.email || guard.username || '—'],
          ].map(([label, val]) => (
            <div key={label} className="bg-white/10 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-white/60">{label}</p>
              <p className="text-sm font-bold truncate">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two buttons: Time Records / History Logs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('time')} className="flex-1 py-3 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2"
                style={tab === 'time' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
          <Clock size={16} /> Time Records
        </button>
        <button onClick={() => setTab('logs')} className="flex-1 py-3 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2"
                style={tab === 'logs' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
          <ClipboardList size={16} /> History Logs
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        {loading ? (<p className="text-center text-ink/50 py-10 text-sm">Loading…</p>) : tab === 'time' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-ink">Time In / Time Out Records</p>
                <p className="text-xs text-ink/60">Shift Schedule: <span className="font-semibold">{guard.shift || 'No shift set'}</span> · auto time-in on login, time-out on end shift.</p>
              </div>
              <div className="flex gap-1">
                <button onClick={exportShiftPDF} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-ink" title="Export PDF"><FileDown size={16} /></button>
                <button onClick={exportShiftExcel} className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#0F6E6E' }} title="Export Excel"><FileSpreadsheet size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] font-bold text-white rounded-lg mb-1" style={{ backgroundColor: '#0F6E6E' }}>
              <span>Date</span><span>Time In</span><span>Time Out</span><span className="text-center">Status</span>
            </div>
            {shifts.length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No shift records yet.</p>
            ) : (
              <div className="max-h-[48vh] overflow-y-auto">
                {shifts.map((s) => (
                  <div key={s.shift_id} className="grid grid-cols-4 gap-2 px-3 py-3 border-b border-gray-100 text-sm text-ink items-center">
                    <span className="font-bold text-[13px]">{fmtDateOnly(s.time_in)}</span>
                    <span className="font-semibold">{fmtTimeOnly(s.time_in)}</span>
                    <span className="text-ink/70">{s.ended_at ? fmtTimeOnly(s.ended_at) : '—'}</span>
                    <span className="text-center">
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={s.ended_at ? { backgroundColor: '#F3C9C9', color: '#8a2b2b' } : { backgroundColor: '#B4E4BE', color: '#1e6b2e' }}>
                        {s.ended_at ? 'Ended' : 'On Duty'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="font-bold text-ink mb-1">History Logs — Processed Entries</p>
            <p className="text-xs text-ink/60 mb-3">{logs.length} entr{logs.length === 1 ? 'y' : 'ies'} processed by {guard.fullName}.</p>
            <VisitorLogsPanel records={logs} onExportPDF={exportLogsPDF} onExportExcel={exportLogsExcel} heightClass="max-h-[46vh]" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Reusable Add/Edit form (walang gate assignment) ──
function GuardForm({ title, initial, showManage, onClose, onSubmit, onReset, onDelete }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    shift: initial?.shift && initial.shift !== '—' ? initial.shift : '',
    contact: initial?.contact || '',
    email: initial?.email || '',
    photo: initial?.photo || null,
  });

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToSquare(file);
    if (b64) setForm((f) => ({ ...f, photo: b64 }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
        <h2 className="text-xl font-extrabold text-ink mb-1">{title}</h2>
        {!initial && <p className="text-xs text-ink/60 mb-4">Ang username at password ay awtomatikong gagawin.</p>}
        {initial && <p className="text-xs text-ink/60 mb-4">Username: <span className="font-semibold">{initial.username}</span></p>}

        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <Avatar src={form.photo} size={84} />
            <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full text-white flex items-center justify-center shadow" style={{ backgroundColor: '#0F6E6E' }}>
              <Camera size={15} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          <p className="text-[11px] text-ink/50 mt-2">Upload 1x1 photo (optional)</p>
          {form.photo && <button type="button" onClick={() => setForm((f) => ({ ...f, photo: null }))} className="text-[11px] font-semibold text-red-600 mt-1">Remove photo</button>}
        </div>

        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Full Name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                   placeholder="Carlos Aquino" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Contact Number</label>
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                   placeholder="0917 123 4567" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                   placeholder="guard@email.com" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Shift Schedule</label>
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none">
              <option value="">Select Shift</option>
              <option value="6:00 AM - 6:00 PM">6:00 AM - 6:00 PM</option>
              <option value="6:00 PM - 6:00 AM">6:00 PM - 6:00 AM</option>
            </select>
          </div>
          {initial && (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#F5F2E9', color: '#5b4a2e' }}>
              Duty status is <span className="font-semibold">automatic</span> — On Duty while logged in within the shift, Off Duty once the shift ends.
            </div>
          )}
        </div>

        {showManage && (
          <div className="flex gap-2 mt-4">
            <button onClick={onReset} className="flex-1 py-2.5 rounded-full border border-amber-400 text-amber-700 font-medium text-xs bg-amber-50 flex items-center justify-center gap-1 whitespace-nowrap"><KeyRound size={14} /> Reset Password</button>
            <button onClick={onDelete} className="flex-1 py-2.5 rounded-full border border-red-300 text-red-700 font-medium text-xs bg-red-50 flex items-center justify-center gap-1 whitespace-nowrap"><Trash2 size={14} /> Delete Guard</button>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-gray-300 font-medium text-ink text-sm">Cancel</button>
          <button onClick={() => { if (!form.fullName.trim()) { alert('Full name is required.'); return; } onSubmit(form); }}
                  className="flex-1 py-3 rounded-full text-white font-semibold text-sm whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
            {initial ? 'Save Changes' : 'Add Guard'}
          </button>
        </div>
      </div>
    </div>
  );
}
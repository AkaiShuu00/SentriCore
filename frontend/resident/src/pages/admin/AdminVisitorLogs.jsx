import { useState } from 'react';
import AdminLayout from './components/AdminLayout';

// ── Sample data (iko-connect sa DB after) ──
const LOGS = [
  { visitor: 'Juan Dela Cruz', type: 'Visitor', resident: 'Reina Magpantay', unit: '207 Gemini', entry: 'May 21, 6:00 PM', exit: 'May 21, 6:30 PM', status: 'DEPARTED', guard: 'Carlos A.', pass: 'P-1050', kind: 'visitor' },
  { visitor: 'Jayjay Santiago', type: 'Driver', resident: 'Marina Lewis', unit: '34 Cancer', entry: 'May 21, 3:00 PM', exit: '-----', status: 'ACTIVE', guard: 'Miguel R.', pass: 'P-1051', kind: 'driver' },
  { visitor: 'Vincent Reyes', type: 'Visitor', resident: 'Reina Magpantay', unit: '207 Gemini', entry: 'May 21, 5:30 PM', exit: 'May 21, 9:00 PM', status: 'DEPARTED', guard: 'Carlos A.', pass: 'P-1052', kind: 'visitor' },
  { visitor: 'Prince Nolasco', type: 'Delivery', resident: 'Bel Magpantay', unit: 'C-8', entry: 'May 21, 2:15 PM', exit: 'May 21, 2:45 PM', status: 'DEPARTED', guard: 'Miguel R.', pass: 'P-1053', kind: 'delivery' },
  { visitor: 'Teil Hernade', type: 'Visitor', resident: 'Andrew Pumingas', unit: 'B-12', entry: 'May 21, 4:00 PM', exit: '-----', status: 'ACTIVE', guard: 'Carla G.', pass: 'P-1054', kind: 'visitor' },
  { visitor: 'Spongebob Squarepants', type: 'Visitor', resident: 'Reina Magpantay', unit: '207 Gemini', entry: 'May 21, 3:34 PM', exit: 'May 21, 7:00 PM', status: 'DEPARTED', guard: 'Miguel R.', pass: 'P-1055', kind: 'visitor' },
  { visitor: 'Princess Perez', type: 'Delivery', resident: 'Delia Samaco', unit: 'A-6', entry: 'May 21, 10:00 AM', exit: 'May 21, 10:30 AM', status: 'DEPARTED', guard: 'Carla G.', pass: 'P-1056', kind: 'delivery' },
  { visitor: 'Adrina Bathrom', type: 'Visitor', resident: 'Aiyana Fruto', unit: 'D-3', entry: 'May 21, 11:00 AM', exit: 'May 21, 1:00 PM', status: 'EXPIRED', guard: 'Miguel R.', pass: 'P-1057', kind: 'visitor' },
  { visitor: 'Mimai Grande', type: 'Driver', resident: 'Marina Lewis', unit: '34 Cancer', entry: 'May 21, 7:45 AM', exit: 'May 21, 9:15 AM', status: 'DEPARTED', guard: 'Carla G.', pass: 'P-1058', kind: 'driver' },
  { visitor: 'Tony Hawk', type: 'Visitor', resident: 'Reina Magpantay', unit: '207 Gemini', entry: 'May 21, 8:00 PM', exit: '-----', status: 'ACTIVE', guard: 'Carlos A.', pass: 'P-1059', kind: 'visitor' },
];

const statusBg = {
  ACTIVE:   { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  EXPIRED:  { backgroundColor: '#D9D9D9', color: '#555' },
};

const TYPES = ['All Types', 'Visitor', 'Driver', 'Delivery'];
const STATUSES = ['All Status', 'ACTIVE', 'DEPARTED', 'EXPIRED'];

// Stylized ID card placeholder
function IDCard({ name }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm bg-white w-full">
      <div className="h-7 flex items-center justify-center text-[8px] font-bold text-white"
           style={{ background: 'linear-gradient(90deg,#0F5E5E,#7FB0AE)' }}>
        REPUBLIC OF THE PHILIPPINES · NATIONAL ID
      </div>
      <div className="flex gap-3 p-3">
        <div className="w-16 h-20 rounded bg-gray-200 flex items-center justify-center text-2xl">🧑</div>
        <div className="flex-1 space-y-1 pt-1">
          <div className="h-2 bg-gray-200 rounded w-3/4" />
          <div className="h-2 bg-gray-200 rounded w-1/2" />
          <div className="h-2 bg-gray-200 rounded w-2/3" />
          <div className="h-2 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
      {name && <div className="border-t border-gray-200 px-3 py-2"><span className="text-xs text-ink font-semibold">Name: {name}</span></div>}
    </div>
  );
}

export default function AdminVisitorLogs() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [detail, setDetail] = useState(null);

  const filtered = LOGS
    .filter((l) => typeFilter === 'All Types' || l.type === typeFilter)
    .filter((l) => statusFilter === 'All Status' || l.status === statusFilter)
    .filter((l) => l.visitor.toLowerCase().includes(search.toLowerCase()) || l.pass.toLowerCase().includes(search.toLowerCase()));

  const modalTitle = { visitor: 'Visitor Details', driver: 'Driver Details', delivery: 'Delivery Details' };

  return (
    <AdminLayout>
      {/* Title + actions */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Visitor Logs</h1>
          <p className="text-sm text-ink/60">Complete visitor transaction history</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink">Export PDF</button>
          <button className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>Export Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm flex-1">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visitor or pass ID"
                 className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
        </div>
        <input type="date" className="bg-white rounded-full px-4 py-2 shadow-sm text-sm text-ink outline-none" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink outline-none">
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink outline-none">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 gap-2 px-5 py-3 bg-gray-50 text-[11px] font-bold text-ink/60">
          <span>Visitor Name</span><span>Type</span><span>Resident</span>
          <span>Entry</span><span>Exit</span><span className="text-center">Status</span>
          <span>Guard</span><span>Visitor Pass</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.map((l, i) => (
            <button key={i} onClick={() => setDetail(l)}
                    className="w-full grid grid-cols-8 gap-2 px-5 py-3 border-b border-gray-100 text-[12px] text-ink items-center text-left hover:bg-cream/40">
              <span className="font-semibold truncate">{l.visitor}</span>
              <span className="text-ink/70">{l.type}</span>
              <span className="text-ink/70 truncate">{l.resident}</span>
              <span className="text-ink/60">{l.entry}</span>
              <span className="text-ink/60">{l.exit}</span>
              <span className="text-center">
                <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={statusBg[l.status]}>{l.status}</span>
              </span>
              <span className="text-ink/70">{l.guard}</span>
              <span className="font-bold">{l.pass}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-ink/50 py-10 text-sm">No logs found.</p>}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-teal-800 text-center mb-4">{modalTitle[detail.kind]}</h2>

            <div className="mb-4"><IDCard name={detail.visitor} /></div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ['Name', detail.visitor],
                ['Pass ID', detail.pass],
                [detail.kind === 'visitor' ? 'Visitor Type' : detail.kind === 'driver' ? 'Driver' : 'Delivery', detail.type],
                ['Guard', detail.guard],
                ['Resident Name', detail.resident],
                ['Unit', detail.unit],
                ['Entry', detail.entry],
                ['Exit', detail.exit],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-ink/40">{label}</p>
                  <p className="text-sm text-ink font-semibold">{val}</p>
                </div>
              ))}
            </div>

            <button className="w-full text-white font-bold py-3 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
              Download Record
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
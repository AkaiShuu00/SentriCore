import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import { X, FileDown, FileSpreadsheet } from 'lucide-react';
import { getAllVisitorLogs } from '../../api';
import { exportExcel, exportPDF } from '../../utils/exportUtils';

const statusBg = {
  Active:    { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  Completed: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Departed:  { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Expired:   { backgroundColor: '#D9D9D9', color: '#555' },
};

// #1 — Tinanggal ang "Driver"; Visitors + Delivery na lang.
const TYPES = ['All Types', 'Visitor', 'Delivery'];
const STATUSES = ['All Status', 'Active', 'Departed'];

const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-----';

export default function AdminVisitorLogs() {
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [detail, setDetail] = useState(null);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisitorLogs()
      .then((res) => setLogs((res.data || []).map((t) => ({
        id: t.transaction_id,
        visitor: t.visitor_name,
        type: t.visitor_type || 'Visitor',
        resident: t.resident_name || '',
        unit: t.unit_address || '',
        entry: fmt(t.entry_time),
        exit: fmt(t.exit_time),
        status: t.status === 'Completed' ? 'Departed' : t.status,
        rawStatus: t.status,
        guard: t.guard_name || '—',
        pass: t.pass_number || `P-${t.transaction_id}`,
        purpose: t.purpose || '—',
        regType: t.registration_type || 'Single',
        plate: t.plate_number || '',
        kind: (t.visitor_type || 'Visitor').toLowerCase(),
      }))))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs
    .filter((l) => typeFilter === 'All Types' || l.type === typeFilter)
    .filter((l) => statusFilter === 'All Status' || l.status === statusFilter);

  const modalTitle = { visitor: 'Visitor Details', delivery: 'Delivery Details' };

  // #2 — Working exports (shared template)
  const EXPORT_HEADER = ['Visitor', 'Type', 'Resident', 'Unit', 'Entry', 'Exit', 'Status', 'Guard', 'Pass'];
  const exportRows = () => filtered.map((l) => [l.visitor, l.type, l.resident, l.unit, l.entry, l.exit, l.status, l.guard, l.pass]);
  const doExcel = () => exportExcel('visitor-logs', 'Visitor Logs', EXPORT_HEADER, exportRows());
  const doPDF = () => exportPDF('Visitor Logs', EXPORT_HEADER, exportRows(), { subtitle: 'Complete visitor transaction history' });

  return (
    <AdminLayout>
      {/* Title + actions */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-800">Visitor Logs</h1>
          <p className="text-sm text-ink/60">Complete Visitor Transaction History</p>
        </div>
        <div className="flex gap-2">
          <button onClick={doPDF} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-medium text-ink whitespace-nowrap"><FileDown size={16} /> Export PDF</button>
          <button onClick={doExcel} className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}><FileSpreadsheet size={16} /> Export Excel</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Filters — #6: tinanggal ang search bar */}
        <div className="flex gap-2 mb-4">
          <input type="date" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-ink outline-none" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-ink outline-none">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-ink outline-none">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-ink outline-none">
            <option>All Gates</option><option>Gate 1</option><option>Gate 2</option>
          </select>
        </div>

        {/* Table */}
        <div className="grid grid-cols-8 gap-2 px-3 py-2 text-xs font-semibold text-ink/60 border-b border-gray-200">
          <span>Visitor Name</span><span>Type</span><span>Resident</span>
          <span>Entry</span><span>Exit</span><span className="text-center">Status</span>
          <span>Guard</span><span>Visitor Pass</span>
        </div>
        <div className="max-h-[58vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-ink/50 py-10 text-sm">Loading logs…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-ink/50 py-10 text-sm">No logs found.</p>
          ) : (
            filtered.map((l) => (
              <button key={l.id} onClick={() => setDetail(l)}
                      className="w-full grid grid-cols-8 gap-2 px-3 py-2.5 border-b border-gray-100 text-xs text-ink items-center text-left hover:bg-cream/40">
                <span className="font-medium truncate">{l.visitor}</span>
                <span className="text-ink/70">{l.type}</span>
                <span className="text-ink/70 truncate">{l.resident}</span>
                <span className="text-ink/60">{l.entry}</span>
                <span className="text-ink/60">{l.exit}</span>
                <span className="text-center">
                  <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span>
                </span>
                <span className="text-ink/70">{l.guard}</span>
                <span className="font-semibold">{l.pass}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h2 className="text-2xl font-extrabold text-teal-800 mb-5">{modalTitle[detail.kind] || 'Visitor Details'}</h2>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-5">
              {[
                ['Name', detail.visitor],
                ['Pass No.', detail.pass],
                [detail.kind === 'delivery' ? 'Delivery' : 'Visitor Type', detail.type],
                ['Guard', detail.guard],
                ['Resident Name', detail.resident],
                ['Resident Address', detail.unit],
                ['Entry', detail.entry],
                ['Exit', detail.exit],
                ['Mode of Arrival', detail.plate ? 'Private Vehicle' : 'Walk-in'],
                ['Registration Type', detail.regType],
              ].map(([label, val]) => (
                <div key={label} className="bg-cream rounded-xl px-3 py-2" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-semibold text-ink/40">{label}</p>
                  <p className="text-sm text-teal-800 font-medium">{val || '—'}</p>
                </div>
              ))}
            </div>

            <button onClick={doPDF} className="w-full text-white font-semibold py-3 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              Download Record
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
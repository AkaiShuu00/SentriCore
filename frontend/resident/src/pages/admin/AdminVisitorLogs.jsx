import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import { getAllVisitorLogs } from '../../api';

const statusBg = {
  Active:    { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  Completed: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Departed:  { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Expired:   { backgroundColor: '#D9D9D9', color: '#555' },
};
const statusLabel = (s) => (s === 'Completed' ? 'Departed' : s);

const TYPES = ['All Types', 'Visitor', 'Driver', 'Delivery'];
const STATUSES = ['All Status', 'Active', 'Departed'];

const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-----';

export default function AdminVisitorLogs() {
  const [search, setSearch] = useState('');
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
    .filter((l) => statusFilter === 'All Status' || l.status === statusFilter)
    .filter((l) => l.visitor.toLowerCase().includes(search.toLowerCase()) || l.pass.toLowerCase().includes(search.toLowerCase()));

  const modalTitle = { visitor: 'Visitor Details', driver: 'Driver Details', delivery: 'Delivery Details' };

  // ── Export CSV/Excel (SheetJS optional; CSV fallback) ──
  const exportExcel = () => {
    if (filtered.length === 0) { alert('No logs to export.'); return; }
    const header = ['Visitor', 'Type', 'Resident', 'Unit', 'Entry', 'Exit', 'Status', 'Guard', 'Pass'];
    const rows = filtered.map((l) => [l.visitor, l.type, l.resident, l.unit, l.entry, l.exit, l.status, l.guard, l.pass]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'visitor-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export PDF (print-based — walang extra library) ──
  const exportPDF = () => {
    if (filtered.length === 0) { alert('No logs to export.'); return; }
    const rowsHtml = filtered.map((l) => `
      <tr>
        <td>${l.visitor}</td><td>${l.type}</td><td>${l.resident}</td>
        <td>${l.entry}</td><td>${l.exit}</td><td>${l.status}</td><td>${l.guard}</td><td>${l.pass}</td>
      </tr>`).join('');
    const html = `
      <html><head><title>Visitor Logs</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#123}
        h1{color:#0F6E6E} table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#0E2A2E;color:#fff}
      </style></head><body>
      <h1>SentriCore — Visitor Logs</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table><thead><tr>
        <th>Visitor</th><th>Type</th><th>Resident</th><th>Entry</th><th>Exit</th><th>Status</th><th>Guard</th><th>Pass</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <AdminLayout>
      {/* Title + actions */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-800">Visitor Logs</h1>
          <p className="text-sm text-ink/60">Complete Visitor Transaction History</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink">📄 Export PDF</button>
          <button onClick={exportExcel} className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>📊 Export Excel</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, resident..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>
          <input type="date" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-ink outline-none" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-ink outline-none">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-ink outline-none">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-ink outline-none">
            <option>All Gates</option><option>Gate 1</option><option>Gate 2</option>
          </select>
        </div>

        {/* Table */}
        <div className="grid grid-cols-8 gap-2 px-3 py-2 text-[11px] font-bold text-ink/60 border-b border-gray-200">
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
                      className="w-full grid grid-cols-8 gap-2 px-3 py-2.5 border-b border-gray-100 text-[12px] text-ink items-center text-left hover:bg-cream/40">
                <span className="font-semibold truncate">{l.visitor}</span>
                <span className="text-ink/70">{l.type}</span>
                <span className="text-ink/70 truncate">{l.resident}</span>
                <span className="text-ink/60">{l.entry}</span>
                <span className="text-ink/60">{l.exit}</span>
                <span className="text-center">
                  <span className="text-[9px] font-bold px-3 py-1 rounded-full" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span>
                </span>
                <span className="text-ink/70">{l.guard}</span>
                <span className="font-bold">{l.pass}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail modal — walang ID placeholder */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-2xl font-extrabold text-teal-800 mb-5">{modalTitle[detail.kind] || 'Visitor Details'}</h2>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-5">
              {[
                ['Name', detail.visitor],
                ['Pass No.', detail.pass],
                [detail.kind === 'driver' ? 'Driver' : detail.kind === 'delivery' ? 'Delivery' : 'Visitor Type', detail.type],
                ['Guard', detail.guard],
                ['Resident Name', detail.resident],
                ['Resident Address', detail.unit],
                ['Entry', detail.entry],
                ['Exit', detail.exit],
                ['Mode of Arrival', detail.plate ? 'Private Vehicle' : 'Walk-in'],
                ['Registration Type', detail.regType],
              ].map(([label, val]) => (
                <div key={label} className="bg-cream rounded-xl px-3 py-2" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-bold text-ink/40">{label}</p>
                  <p className="text-sm text-teal-800 font-semibold">{val || '—'}</p>
                </div>
              ))}
            </div>

            <button onClick={exportPDF} className="w-full text-white font-bold py-3 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>
              Download Record
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
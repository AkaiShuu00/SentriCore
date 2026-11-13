import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import { Search, X, FileDown, FileSpreadsheet } from 'lucide-react';
import { getAllVisitorLogs, expireCheck } from '../../api';
import { exportExcel, exportPDF, exportRecordPDF } from '../../utils/exportUtils';

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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [detail, setDetail] = useState(null);
  const [linkView, setLinkView] = useState('none'); // none | entry | exit

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Markahan muna ang lumipas (>3 araw) bilang Expired, tapos kunin ang logs
    expireCheck().catch(() => {}).finally(() => {
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
          // Linked info (para sa Linked Entry/Exit grouping)
          arrivalId: t.arrival_id || null,
          entryTime: t.entry_time || null,
          exitTime: t.exit_time || null,
        }))))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    });
  }, []);

  const filtered = logs
    .filter((l) => typeFilter === 'All Types' || l.type === typeFilter)
    .filter((l) => statusFilter === 'All Status' || l.status === statusFilter)
    .filter((l) => {
      const q = search.toLowerCase();
      return !q || l.visitor.toLowerCase().includes(q) || l.pass.toLowerCase().includes(q) || l.resident.toLowerCase().includes(q);
    });

  const modalTitle = { visitor: 'Visitor Details', delivery: 'Delivery Details' };

  // #3 — LINKED grouping (admin): ENTRY = iisang arrival_id; EXIT = iisang petsa+oras ng exit (hanggang minuto)
  const minuteKey = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const buildLinked = () => {
    const map = new Map();
    if (linkView === 'entry') {
      filtered.forEach((l) => {
        if (!l.arrivalId) return;
        const k = 'A' + l.arrivalId;
        if (!map.has(k)) map.set(k, { key: k, when: l.entryTime, members: [] });
        map.get(k).members.push(l);
      });
    } else if (linkView === 'exit') {
      filtered.forEach((l) => {
        if (l.rawStatus !== 'Completed' || !l.exitTime) return;
        const k = minuteKey(l.exitTime);
        if (!map.has(k)) map.set(k, { key: k, when: l.exitTime, members: [] });
        map.get(k).members.push(l);
      });
    }
    let groups = Array.from(map.values()).filter((g) => g.members.length >= 2);
    groups.forEach((g) => {
      g.activeCount = g.members.filter((m) => m.rawStatus === 'Active').length;
      g.members.sort((a, b) => (a.rawStatus === b.rawStatus ? 0 : a.rawStatus === 'Active' ? -1 : 1));
    });
    groups.sort((a, b) => new Date(b.when) - new Date(a.when));
    return groups;
  };
  const linkedGroups = linkView !== 'none' ? buildLinked() : [];

  // #2 — Working exports (shared template)
  const EXPORT_HEADER = ['Visitor', 'Type', 'Resident', 'Unit', 'Entry', 'Exit', 'Status', 'Guard', 'Pass'];
  const exportRows = () => filtered.map((l) => [l.visitor, l.type, l.resident, l.unit, l.entry, l.exit, l.status, l.guard, l.pass]);
  const doExcel = () => exportExcel('visitor-logs', 'Visitor Logs', EXPORT_HEADER, exportRows());
  const doPDF = () => exportPDF('Visitor Logs', EXPORT_HEADER, exportRows(), { subtitle: 'Complete visitor transaction history' });

  // #1 — Solo visitor "record" → sariling PDF (hindi buong table)
  const doRecordPDF = (l) => {
    if (!l) return;
    const fields = [
      ['Name', l.visitor],
      ['Pass No.', l.pass],
      [l.kind === 'delivery' ? 'Delivery Type' : 'Visitor Type', l.type],
      ['Guard', l.guard],
      ['Resident Name', l.resident],
      ['Resident Address', l.unit],
      ['Purpose', l.purpose],
      ['Entry', l.entry],
      ['Exit', l.exit],
      ['Status', l.status],
      ['Mode of Arrival', l.plate ? 'Private Vehicle' : 'Non-Motorized'],
      ['Plate Number', l.plate || 'Non-Motorized'],
      ['Registration Type', l.regType],
    ];
    exportRecordPDF('Visitor Record', fields, { subtitle: `${l.visitor} · ${l.pass}`, filename: `visitor-record-${l.pass}` });
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
          <button onClick={doPDF} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-medium text-ink whitespace-nowrap"><FileDown size={16} /> Export PDF</button>
          <button onClick={doExcel} className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}><FileSpreadsheet size={16} /> Export Excel</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Filters — may search bar para mabilis hanapin ang bisita */}
        <div className="flex gap-2 mb-4">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
            <Search size={18} className="text-ink/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visitor, resident, pass..."
                   className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
          </div>
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

        {/* #3 — View mode: All / Linked Entry / Linked Exit */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'none', label: 'All Logs' },
            { key: 'entry', label: 'Linked Entry' },
            { key: 'exit', label: 'Linked Exit' },
          ].map((m) => (
            <button key={m.key} onClick={() => setLinkView(m.key)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={linkView === m.key ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
              {m.label}
            </button>
          ))}
          {linkView !== 'none' && (
            <span className="text-[11px] text-ink/50 self-center ml-1">
              {linkView === 'entry' ? 'Magkasabay na PUMASOK (iisang arrival).' : 'Magkasabay na LUMABAS (iisang oras ng exit).'}
            </span>
          )}
        </div>

        {/* Table (All Logs) */}
        {linkView === 'none' && (<>
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
        </>)}

        {/* Linked grouped view (Entry/Exit) */}
        {linkView !== 'none' && (
          <div className="max-h-[62vh] overflow-y-auto space-y-3">
            {loading ? (
              <p className="text-center text-ink/50 py-10 text-sm">Loading logs…</p>
            ) : linkedGroups.length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No linked {linkView === 'entry' ? 'entries' : 'exits'} found. Groups of 2+ who {linkView === 'entry' ? 'entered' : 'exited'} together appear here.</p>
            ) : (
              linkedGroups.map((g) => (
                <div key={g.key} className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#E8F0EE' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#0F6E6E' }}>
                        LINKED {linkView === 'entry' ? 'ENTRY' : 'EXIT'}
                      </span>
                      <span className="text-xs font-bold text-ink">
                        {g.members.length} people{linkView === 'entry' ? ` · ${g.activeCount} active` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink/60">
                      {g.when ? new Date(g.when).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {g.members.map((l) => (
                      <button key={l.id} onClick={() => setDetail(l)}
                              className="w-full flex items-center justify-between px-4 py-2.5 gap-2 text-left hover:bg-cream/40">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink text-sm truncate">{l.visitor}</p>
                          <p className="text-[11px] text-ink/60 truncate">{l.type} · {l.resident} · {l.unit}</p>
                          <p className="text-[11px] text-ink/50">{l.entry} → {l.exit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-ink">{l.pass}</p>
                          <span className="text-[9px] font-semibold px-2 py-1 rounded-full inline-block mt-1" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
                ['Mode of Arrival', detail.plate ? 'Private Vehicle' : 'Non-Motorized'],
                ['Registration Type', detail.regType],
              ].map(([label, val]) => (
                <div key={label} className="bg-cream rounded-xl px-3 py-2" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-semibold text-ink/40">{label}</p>
                  <p className="text-sm text-teal-800 font-medium">{val || '—'}</p>
                </div>
              ))}
            </div>

            <button onClick={() => doRecordPDF(detail)} className="w-full text-white font-semibold py-3 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
              Download Record
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
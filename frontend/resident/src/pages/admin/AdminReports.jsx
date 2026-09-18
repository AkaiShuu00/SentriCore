import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { adminMonthlyReport, adminListComplaints, adminResolveComplaint, adminAuditReport } from '../../api';

const REPORT_CARDS = [
  { key: 'monthly',    title: 'Monthly Report',      desc: 'Total visitors, trends, peak visitation days.', icon: '📈' },
  { key: 'complaints', title: 'Complaints',          desc: 'Resident-filed complaints & resolutions.', icon: '📣' },
  { key: 'incident',   title: 'Incident Monitoring', desc: 'Rejected entries, unresolved exits.', icon: '🛡️' },
  { key: 'audit',      title: 'Audit Trails',        desc: 'Track all system actions.', icon: '🕐' },
];

const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Mga iminumungkahing resolution kada kategorya (angkop sa uri ng reklamo)
const RESOLUTIONS = {
  Visitor: ['Visitor issued a warning', 'Visitor added to blocklist', 'Investigated — no violation found', 'Referred to security team', 'Resolved with the resident'],
  Guard: ['Guard verbally reminded', 'Retraining scheduled', 'Written warning issued', 'Investigated — unfounded', 'Escalated to management'],
  Security: ['Patrol increased in the area', 'Reported to local authorities', 'CCTV footage reviewed', 'Area secured & monitored', 'Under active investigation'],
  HOA: ['Maintenance request scheduled', 'Policy clarified to resident', 'Notice issued to violator', 'Referred to HOA board', 'Resolved'],
};
const CAT_COLOR = {
  Visitor: { bg: '#CFEDE4', fg: '#0F6E6E' },
  Guard: { bg: '#F1D88A', fg: '#8a6d12' },
  Security: { bg: '#F3C9C9', fg: '#9b2c2c' },
  HOA: { bg: '#D9C2E9', fg: '#5b2c86' },
};
const STATUS_COLOR = {
  Pending: { bg: '#F3C9C9', fg: '#9b2c2c' },
  Acknowledged: { bg: '#F1D88A', fg: '#8a6d12' },
  Resolved: { bg: '#B4E4BE', fg: '#1e6b2e' },
};

export default function AdminReports() {
  const [view, setView] = useState('overview');
  const [showGen, setShowGen] = useState(false);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Complaints
  const [complaints, setComplaints] = useState(null);   // { list, summary }
  const [catFilter, setCatFilter] = useState('All');
  const [compStatus, setCompStatus] = useState('All');
  const [compSearch, setCompSearch] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null); // napiling complaint
  const [resolText, setResolText] = useState('');
  const [resolStatus, setResolStatus] = useState('Resolved');
  const [savingResol, setSavingResol] = useState(false);

  const loadComplaints = () =>
    adminListComplaints()
      .then((res) => setComplaints(res.data))
      .catch(() => setComplaints({ list: [], summary: {} }));

  useEffect(() => {
    adminMonthlyReport()
      .then((res) => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
    loadComplaints();
    adminAuditReport()
      .then((res) => setAudit(res.data))
      .catch(() => setAudit(null));
  }, []);

  const openResolve = (c) => {
    setResolveTarget(c);
    setResolText(c.resolution || '');
    setResolStatus(c.status === 'Resolved' ? 'Resolved' : 'Acknowledged');
  };
  const saveResolve = async () => {
    if (!resolveTarget) return;
    setSavingResol(true);
    try {
      await adminResolveComplaint(resolveTarget.complaint_id, { status: resolStatus, resolution: resolText });
      await loadComplaints();
      setResolveTarget(null);
    } catch {
      alert('Failed to save resolution. Please try again.');
    } finally {
      setSavingResol(false);
    }
  };

  // ── Export helpers (CSV + print PDF) ──
  const exportCSV = (filename, header, rows) => {
    if (!rows.length) { alert('No data to export.'); return; }
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportPDF = (title, header, rows) => {
    if (!rows.length) { alert('No data to export.'); return; }
    const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    const html = `<html><head><title>${title}</title>
      <style>body{font-family:Arial;padding:24px;color:#123}h1{color:#0F6E6E}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#0E2A2E;color:#fff}</style>
      </head><body><h1>SentriCore — ${title}</h1><p>${new Date().toLocaleString()}</p>
      <table><thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  const doExport = (type) => {
    if (view === 'monthly') {
      const header = ['Month', 'Visitors', 'Deliveries', 'Total'];
      const rows = (report?.table || []).map((m) => [m.fullLabel, m.visitors, m.deliveries, m.total]);
      type === 'pdf' ? exportPDF('Monthly Report', header, rows) : exportCSV('monthly-report.csv', header, rows);
    } else if (view === 'complaints') {
      const header = ['Category', 'Subject', 'Type', 'Filed By', 'Incident Date', 'Status', 'Resolution'];
      const rows = (complaints?.list || []).map((c) => [c.category, c.subject, c.complaint_type, c.resident_name || '—', fmtDate(c.incident_date), c.status, c.resolution || '']);
      type === 'pdf' ? exportPDF('Complaints', header, rows) : exportCSV('complaints.csv', header, rows);
    } else if (view === 'incident') {
      const header = ['Visitor', 'Resident', 'Unit', 'Observation', 'Detail', 'Time'];
      const rows = (report?.exitNotes?.flagged || []).map((f) => [f.visitor, f.resident, f.unit, f.note, f.detail || '', f.time ? new Date(f.time).toLocaleString('en-US') : '']);
      type === 'pdf' ? exportPDF('Incident Monitoring', header, rows) : exportCSV('incident-monitoring.csv', header, rows);
    } else if (view === 'audit') {
      const header = ['Date & Time', 'Actor', 'Role', 'Action', 'Details'];
      const rows = (audit?.list || []).map((a) => [a.ts ? new Date(a.ts).toLocaleString('en-US') : '', a.actor, a.role, a.action, a.details]);
      type === 'pdf' ? exportPDF('Audit Trails', header, rows) : exportCSV('audit-trails.csv', header, rows);
    } else {
      alert('Nothing to export on this view yet.');
    }
  };

  const overview = report?.overview || { totalVisitors: 0, totalDeliveries: 0, peakDay: null, monthLabel: '' };
  const chart = report?.chart || [];
  const table = report?.table || [];
  const summary = report?.summary || {};

  const Header = () => (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h1 className="text-3xl font-extrabold text-teal-800">Reports</h1>
        <p className="text-sm text-ink/60">Generated reports and long-term analytics.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => doExport('pdf')} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink">📄 Export PDF</button>
        <button onClick={() => doExport('excel')} className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>📊 Export Excel</button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <Header />

      {/* OVERVIEW */}
      {view === 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-5 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input placeholder="Search name, resident..." className="flex-1 outline-none text-sm bg-transparent" />
          </div>

          {/* Month overview banner */}
          <div className="rounded-2xl p-6 flex items-center justify-between mb-6"
               style={{ background: 'linear-gradient(135deg,#0E2A2E 0%,#2E8C7E 100%)' }}>
            <div className="text-white">
              <p className="text-3xl font-extrabold">{overview.monthLabel || '—'}</p>
              <p className="text-sm text-white/70">Monthly Overview</p>
              <p className="text-[11px] text-white/50 italic mt-2">Snapshot of the current month at a glance.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/95 rounded-2xl px-6 py-3 text-center min-w-[110px]">
                <p className="text-[10px] font-bold text-ink/50">Total Visitors</p>
                <p className="text-3xl font-extrabold text-ink">{overview.totalVisitors}</p>
              </div>
              <div className="bg-white/95 rounded-2xl px-6 py-3 text-center min-w-[110px]">
                <p className="text-[10px] font-bold text-ink/50">Total Deliveries</p>
                <p className="text-3xl font-extrabold text-ink">{overview.totalDeliveries}</p>
              </div>
              <div className="rounded-2xl px-6 py-3 text-center min-w-[110px] text-white" style={{ backgroundColor: '#1E7E7E' }}>
                <p className="text-[10px] font-bold text-white/70">Peak Day</p>
                <p className="text-2xl font-extrabold">{fmtDay(overview.peakDay)}</p>
              </div>
            </div>
          </div>

          {/* Report cards */}
          <div className="grid grid-cols-2 gap-4">
            {REPORT_CARDS.map((c) => (
              <div key={c.key} className="rounded-2xl p-5 shadow-sm flex items-center gap-4" style={{ backgroundColor: '#F5F2E9' }}>
                <div className="flex-1">
                  <p className="font-extrabold text-ink">{c.title}</p>
                  <p className="text-xs text-ink/60 mb-3">{c.desc}</p>
                  <button onClick={() => setView(c.key)}
                          className="text-ink text-sm font-bold px-8 py-2 rounded-full bg-white border border-gray-200 shadow-sm">View</button>
                </div>
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">{c.icon}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTHLY */}
      {view === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-4 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input placeholder="Search name, resident..." className="flex-1 outline-none text-sm bg-transparent" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-ink">Monthly Report</h3>
              <p className="text-xs text-ink/60">Total visitors, trends, peak visitation days.</p>
            </div>
            <button onClick={() => setShowGen(true)} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Summary</button>
          </div>

          {/* Chart */}
          <div className="border border-gray-100 rounded-2xl p-4 mt-3">
            <p className="text-center font-extrabold text-teal-800 mb-3">
              {chart.length ? `${chart[0].label} to ${chart[chart.length - 1].label} Report` : 'Report'}
            </p>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="visitors" name="visitors" fill="#1E7E7E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="deliveries" name="deliveries" fill="#E0A83E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="grid grid-cols-4 gap-2 mt-5 mb-2">
            {['MONTH', 'VISITORS', 'DELIVERIES', 'TOTAL'].map((h, i) => (
              <span key={h} className={`text-[11px] font-bold text-white px-4 py-2 rounded-lg ${i > 0 ? 'text-center' : ''}`} style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
            ))}
          </div>
          {table.map((m, i) => (
            <div key={i} className={`grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 text-sm ${i === 0 ? 'rounded-xl' : ''}`}
                 style={i === 0 ? { backgroundColor: '#CFEDE4' } : {}}>
              <span className="font-bold text-ink">{m.fullLabel}</span>
              <span className="text-center text-ink/80">{m.visitors}</span>
              <span className="text-center text-ink/80">{m.deliveries}</span>
              <span className="text-center font-bold text-ink">{m.total}</span>
            </div>
          ))}

          <div className="flex justify-end mt-5">
            <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full flex items-center gap-1" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
          </div>
        </div>
      )}

      {/* COMPLAINTS — mula sa residents, may resolution ng admin */}
      {view === 'complaints' && (() => {
        const cx = complaints || { list: [], summary: {} };
        const sum = cx.summary || {};
        const cats = ['All', 'Visitor', 'Guard', 'Security', 'HOA'];
        const statuses = ['All', 'Pending', 'Acknowledged', 'Resolved'];
        const q = compSearch.toLowerCase();
        const list = (cx.list || [])
          .filter((c) => catFilter === 'All' || c.category === catFilter)
          .filter((c) => compStatus === 'All' || c.status === compStatus)
          .filter((c) => !q || (c.subject || '').toLowerCase().includes(q)
            || (c.complaint_type || '').toLowerCase().includes(q)
            || (c.resident_name || '').toLowerCase().includes(q));
        return (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-ink">Complaints</h3>
                <p className="text-xs text-ink/60">Resident-filed complaints — acknowledge & resolve.</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            {/* Category count cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['Visitor', 'Guard', 'Security', 'HOA'].map((k) => (
                <div key={k} className="rounded-2xl px-4 py-3 text-center" style={{ backgroundColor: CAT_COLOR[k].bg }}>
                  <p className="text-2xl font-extrabold" style={{ color: CAT_COLOR[k].fg }}>{sum.byCategory ? (sum.byCategory[k] || 0) : 0}</p>
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: CAT_COLOR[k].fg }}>{k}</p>
                </div>
              ))}
            </div>

            {/* Filters: category tabs + status + search */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
              {cats.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)}
                        className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 ${catFilter === c ? 'text-white' : 'bg-white text-ink border border-gray-200'}`}
                        style={catFilter === c ? { backgroundColor: '#0F6E6E' } : {}}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <select value={compStatus} onChange={(e) => setCompStatus(e.target.value)}
                      className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-ink outline-none">
                {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
              </select>
              <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 flex-1 min-w-[180px]" style={{ backgroundColor: '#F5F2E9' }}>
                <span className="text-ink/40">🔍</span>
                <input value={compSearch} onChange={(e) => setCompSearch(e.target.value)}
                       placeholder="Search subject, type, resident..." className="flex-1 outline-none text-sm bg-transparent" />
              </div>
            </div>

            {/* Table */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <span className="col-span-2 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>CATEGORY</span>
              <span className="col-span-3 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>SUBJECT</span>
              <span className="col-span-2 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>TYPE</span>
              <span className="col-span-2 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>FILED BY</span>
              <span className="col-span-1 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DATE</span>
              <span className="col-span-2 text-[11px] font-bold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>STATUS</span>
            </div>
            {list.length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No complaints found.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto">
                {list.map((c) => {
                  const cc = CAT_COLOR[c.category] || { bg: '#eee', fg: '#555' };
                  const sc = STATUS_COLOR[c.status] || { bg: '#eee', fg: '#555' };
                  return (
                    <button key={c.complaint_id} onClick={() => openResolve(c)}
                            className="w-full text-left grid grid-cols-12 gap-2 px-3 py-3 border-b border-gray-100 text-sm items-center hover:bg-gray-50">
                      <span className="col-span-2">
                        <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{c.category}</span>
                      </span>
                      <span className="col-span-3 font-bold text-ink truncate">{c.subject}
                        {c.blocklist ? <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3C9C9', color: '#9b2c2c' }}>BLOCKLIST</span> : null}
                      </span>
                      <span className="col-span-2 text-ink/70 text-xs truncate">{c.complaint_type}</span>
                      <span className="col-span-2 text-ink/70 text-xs truncate">{c.resident_name || '—'}</span>
                      <span className="col-span-1 text-ink/60 text-xs">{fmtDate(c.incident_date)}</span>
                      <span className="col-span-2">
                        <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{c.status}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* INCIDENT MONITORING — driven by Exit Notes logged by guards */}
      {view === 'incident' && (() => {
        const en = report?.exitNotes || { counts: {}, totalLogged: 0, flagged: [] };
        const counts = en.counts || {};
        const cards = [
          ['No Problem', counts['No Problem'] || 0, '#B4E4BE', '#1e6b2e'],
          ['Small Issue', counts['Small Issue'] || 0, '#F1D88A', '#8a6d12'],
          ['Security Concern', counts['Security Concern'] || 0, '#F3C9C9', '#9b2c2c'],
          ['Incident Happened', counts['Incident Happened'] || 0, '#D9C2E9', '#5b2c86'],
        ];
        return (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-extrabold text-ink">Incident Monitoring</h3>
                <p className="text-xs text-ink/60">Exit-note observations logged by guards — {overview.monthLabel || 'this month'}.</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            {/* Count cards */}
            <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
              {cards.map(([label, n, bg, fg]) => (
                <div key={label} className="rounded-2xl px-4 py-4 text-center" style={{ backgroundColor: bg }}>
                  <p className="text-3xl font-extrabold" style={{ color: fg }}>{n}</p>
                  <p className="text-[11px] font-bold mt-1" style={{ color: fg }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Flagged observations (Security Concern / Incident Happened) */}
            <p className="text-sm font-bold text-ink mb-2">Flagged Observations</p>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {['VISITOR', 'RESIDENT', 'UNIT', 'OBSERVATION', 'DETAIL / TIME'].map((h) => (
                <span key={h} className="text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
              ))}
            </div>
            {(en.flagged || []).length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No flagged exit observations this month.</p>
            ) : en.flagged.map((f, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-gray-100 text-sm items-center">
                <span className="font-bold text-ink">{f.visitor}</span>
                <span className="text-ink/70">{f.resident}</span>
                <span className="text-ink/70">{f.unit}</span>
                <span className="font-semibold" style={{ color: f.note === 'Incident Happened' ? '#5b2c86' : '#9b2c2c' }}>{f.note}</span>
                <span className="text-ink/70 text-xs">
                  {f.detail || '—'}
                  <span className="block text-ink/40">{f.time ? new Date(f.time).toLocaleString('en-US') : ''}</span>
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* AUDIT TRAILS — sino-ang-gumawa-ng-ano-at-kailan (guard movements + logins) */}
      {view === 'audit' && (() => {
        const a = audit || { list: [], summary: {} };
        const s = a.summary || {};
        const q = auditSearch.toLowerCase();
        const list = (a.list || []).filter((row) =>
          !q ||
          (row.actor || '').toLowerCase().includes(q) ||
          (row.action || '').toLowerCase().includes(q) ||
          (row.details || '').toLowerCase().includes(q) ||
          (row.role || '').toLowerCase().includes(q)
        );
        const roleColor = (r) => r === 'Guard' ? { bg: '#CFEDE4', fg: '#0F6E6E' }
          : r === 'Admin' ? { bg: '#F1D88A', fg: '#8a6d12' }
          : r === 'Resident' ? { bg: '#D9C2E9', fg: '#5b2c86' }
          : { bg: '#eee', fg: '#555' };
        return (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-extrabold text-ink">Audit Trails</h3>
                <p className="text-xs text-ink/60">All recorded movements and system actions — {s.monthLabel || 'this month'}.</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3 mt-4 mb-5">
              {[
                ['Total Actions', s.total ?? 0, '#CFEDE4', '#0F6E6E'],
                ['Entries Logged', s.entries ?? 0, '#DCF3E4', '#1e6b2e'],
                ['Exits Logged', s.exits ?? 0, '#F3C9C9', '#9b2c2c'],
                ['Active Guards', s.activeGuards ?? 0, '#F1D88A', '#8a6d12'],
              ].map(([label, n, bg, fg]) => (
                <div key={label} className="rounded-2xl px-4 py-4 text-center" style={{ backgroundColor: bg }}>
                  <p className="text-3xl font-extrabold" style={{ color: fg }}>{n}</p>
                  <p className="text-[11px] font-bold mt-1" style={{ color: fg }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-4 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
              <span className="text-ink/40">🔍</span>
              <input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)}
                     placeholder="Search actor, action, details..."
                     className="flex-1 outline-none text-sm bg-transparent" />
            </div>

            {/* Table */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <span className="col-span-3 text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DATE &amp; TIME</span>
              <span className="col-span-3 text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>ACTOR</span>
              <span className="col-span-2 text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>ACTION</span>
              <span className="col-span-4 text-[11px] font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DETAILS</span>
            </div>
            {list.length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No audit records for this period.</p>
            ) : (
              <div className="max-h-[52vh] overflow-y-auto">
                {list.map((row, i) => {
                  const rc = roleColor(row.role);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 text-sm items-center">
                      <span className="col-span-3 text-ink/70 text-xs">{row.ts ? new Date(row.ts).toLocaleString('en-US') : '—'}</span>
                      <span className="col-span-3 flex items-center gap-2">
                        <span className="font-bold text-ink">{row.actor}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rc.bg, color: rc.fg }}>{row.role}</span>
                      </span>
                      <span className="col-span-2 font-semibold text-ink/80 text-xs">{row.action}</span>
                      <span className="col-span-4 text-ink/70 text-xs">{row.details}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Generate summary modal (Monthly) */}
      {showGen && view === 'monthly' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowGen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGen(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center">✕</button>
            <h2 className="text-lg font-extrabold text-ink mb-1">📄 Generate — Monthly Report</h2>
            <p className="text-xs text-ink/60 mb-4">
              Generated for {overview.monthLabel}. Includes month-over-month trend, total entries, and peak visitation days.
            </p>
            <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#F5F2E9' }}>
              <span className="text-xs font-bold text-white px-4 py-1.5 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>Highlights</span>
              <ul className="space-y-2 mt-3">
                <li className="text-sm text-ink flex gap-2">
                  <span>•</span>{summary.totalVisitors ?? 0} total visitors
                  {summary.pctVsPrev != null && ` (${summary.pctVsPrev >= 0 ? '+' : ''}${summary.pctVsPrev}% vs prev month)`}
                </li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>{summary.totalDeliveries ?? 0} deliveries logged</li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>Peak day: {fmtDay(summary.peakDay)} ({summary.peakCount ?? 0} entries)</li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>Avg. daily visitors: {summary.avgDaily ?? 0}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Complaint DETAIL + RESOLVE modal */}
      {resolveTarget && (() => {
        const c = resolveTarget;
        const cc = CAT_COLOR[c.category] || { bg: '#eee', fg: '#555' };
        const presets = RESOLUTIONS[c.category] || [];
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setResolveTarget(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setResolveTarget(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center">✕</button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{c.category} Complaint</span>
                {c.blocklist ? <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#F3C9C9', color: '#9b2c2c' }}>Blocklist requested</span> : null}
              </div>
              <h2 className="text-lg font-extrabold text-ink">{c.subject}</h2>
              <p className="text-xs text-ink/60 mb-3">{c.complaint_type} · Incident: {fmtDate(c.incident_date)} · Filed by {c.resident_name || '—'}{c.unit_address ? ` (${c.unit_address})` : ''}</p>

              {c.description && (
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-bold text-ink/50 mb-1">DESCRIPTION</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{c.description}</p>
                </div>
              )}

              {/* Suggested resolutions */}
              <p className="text-[10px] font-bold text-ink/60 mb-1">SUGGESTED RESOLUTIONS</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {presets.map((p) => (
                  <button key={p} type="button" onClick={() => setResolText(p)}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-ink hover:border-teal-500">
                    {p}
                  </button>
                ))}
              </div>

              <label className="block text-[10px] font-bold text-ink/60 mb-1">RESOLUTION / RESPONSE (nakikita ng resident)</label>
              <textarea value={resolText} onChange={(e) => setResolText(e.target.value)} rows={3}
                        placeholder="Type or pick a resolution above…"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none mb-3" />

              <label className="block text-[10px] font-bold text-ink/60 mb-1">STATUS</label>
              <div className="flex gap-2 mb-5">
                {['Acknowledged', 'Resolved'].map((s) => (
                  <button key={s} type="button" onClick={() => setResolStatus(s)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${resolStatus === s ? '' : 'border-gray-200 text-ink'}`}
                          style={resolStatus === s ? { backgroundColor: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].fg, borderColor: STATUS_COLOR[s].fg } : {}}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setResolveTarget(null)} className="px-6 py-2 rounded-full text-sm font-bold text-ink border border-gray-300">Cancel</button>
                <button onClick={saveResolve} disabled={savingResol}
                        className="px-6 py-2 rounded-full text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#0F6E6E' }}>
                  {savingResol ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {loading && view === 'overview' && (
        <p className="text-center text-ink/40 text-sm mt-4">Loading report data…</p>
      )}
    </AdminLayout>
  );
}
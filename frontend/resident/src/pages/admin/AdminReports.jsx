import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { adminMonthlyReport, adminListComplaints, adminResolveComplaint, adminAuditReport, adminGuardReports, adminAckGuardReport } from '../../api';
import { TrendingUp, Megaphone, ShieldAlert, Clock, FileDown, FileSpreadsheet, Search, X, CheckCircle2, MapPin, MessageSquare } from 'lucide-react';
import { exportExcel, exportPDF } from '../../utils/exportUtils';

const REPORT_CARDS = [
  { key: 'monthly',    title: 'Monthly Report',      desc: 'Total visitors, trends, peak visitation days.', Icon: TrendingUp },
  { key: 'complaints', title: 'Complaints',          desc: 'Resident-filed complaints & resolutions.', Icon: Megaphone },
  { key: 'incident',   title: 'Incident Monitoring', desc: 'Reports filed by guards.', Icon: ShieldAlert },
  { key: 'audit',      title: 'Audit Trails',        desc: 'Recorded entries, exits & reports.', Icon: Clock },
];

const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

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
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('view') || 'overview');
  const [showGen, setShowGen] = useState(false);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Complaints
  const [complaints, setComplaints] = useState(null);
  const [catFilter, setCatFilter] = useState('All');
  const [compStatus, setCompStatus] = useState('All');
  const [compSearch, setCompSearch] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolText, setResolText] = useState('');
  const [approveBl, setApproveBl] = useState(false);
  const [savingResol, setSavingResol] = useState(false);

  const [guardReports, setGuardReports] = useState({ list: [], summary: {} });
  const [grThread, setGrThread] = useState(null); // report_id na naka-expand na thread (Incident view)
  const [compSource, setCompSource] = useState(searchParams.get('comp') === 'guard' ? 'guard' : 'resident'); // Complaints tab: resident | guard
  const [grTarget, setGrTarget] = useState(null);           // guard report sa detail modal
  const [ackNote, setAckNote] = useState('');
  const [savingAck, setSavingAck] = useState(false);

  const loadComplaints = () =>
    adminListComplaints()
      .then((res) => setComplaints(res.data))
      .catch(() => setComplaints({ list: [], summary: {} }));
  const loadGuardReports = () =>
    adminGuardReports()
      .then((res) => setGuardReports(res.data || { list: [], summary: {} }))
      .catch(() => setGuardReports({ list: [], summary: {} }));

  useEffect(() => {
    adminMonthlyReport()
      .then((res) => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
    loadComplaints();
    adminAuditReport()
      .then((res) => setAudit(res.data))
      .catch(() => setAudit(null));
    loadGuardReports();
  }, []);

  const openGuardDetail = (g) => { setGrTarget(g); setAckNote(''); };
  const saveGuardAck = async () => {
    if (!grTarget) return;
    setSavingAck(true);
    try {
      await adminAckGuardReport(grTarget.report_id, { note: ackNote });
      await loadGuardReports();
      setGrTarget(null);
    } catch { alert('Failed to acknowledge. Please try again.'); }
    finally { setSavingAck(false); }
  };

  const openResolve = (c) => {
    setResolveTarget(c);
    setResolText(c.resolution || '');
    setApproveBl(false);
  };
  const saveResolve = async () => {
    if (!resolveTarget) return;
    setSavingResol(true);
    try {
      await adminResolveComplaint(resolveTarget.complaint_id, { status: 'Acknowledged', resolution: resolText, approveBlocklist: approveBl });
      await loadComplaints();
      setResolveTarget(null);
    } catch {
      alert('Failed to save resolution. Please try again.');
    } finally {
      setSavingResol(false);
    }
  };

  const overview = report?.overview || { totalVisitors: 0, totalDeliveries: 0, peakDay: null, monthLabel: '' };
  const chart = report?.chart || [];
  const table = report?.table || [];
  const summary = report?.summary || {};

  const auditList = audit?.list || [];

  const doExport = (type) => {
    const run = (name, sheet, title, header, rows, subtitle) =>
      type === 'pdf' ? exportPDF(title, header, rows, { subtitle }) : exportExcel(name, sheet, header, rows);

    if (view === 'monthly') {
      const header = ['Month', 'Visitors', 'Deliveries', 'Total'];
      const rows = (report?.table || []).map((m) => [m.fullLabel, m.visitors, m.deliveries, m.total]);
      run('monthly-report', 'Monthly', 'Monthly Report', header, rows, 'Visitor & delivery totals by month');
    } else if (view === 'complaints') {
      if (compSource === 'guard') {
        const header = ['Guard', 'Category', 'Type of Concern', 'Location', 'Status', 'Date'];
        const rows = (guardReports?.list || []).map((g) => [g.guard_name || '—', g.category, g.report_type, g.location || '—', g.status, g.created_at ? new Date(g.created_at).toLocaleString('en-US') : '']);
        run('guard-complaints', 'Guard', 'Guard Complaints', header, rows, 'Guard-filed reports & acknowledgements');
      } else {
        const header = ['Category', 'Subject', 'Type', 'Filed By', 'Incident Date', 'Status', 'Resolution'];
        const rows = (complaints?.list || []).map((c) => [c.category, c.subject, c.complaint_type, c.resident_name || '—', fmtDate(c.incident_date), c.status, c.resolution || '']);
        run('complaints', 'Complaints', 'Resident Complaints', header, rows, 'Resident-filed complaints & resolutions');
      }
    } else if (view === 'incident') {
      const header = ['Guard', 'Category', 'Type of Concern', 'Location', 'Description', 'Status', 'Date'];
      const rows = (guardReports?.list || []).map((g) => [g.guard_name || '—', g.category, g.report_type, g.location || '—', g.description || '', g.status, g.created_at ? new Date(g.created_at).toLocaleString('en-US') : '']);
      run('incident-monitoring', 'Incidents', 'Incident Monitoring', header, rows, 'Guard-filed reports');
    } else if (view === 'audit') {
      const header = ['Date & Time', 'Actor', 'Role', 'Action', 'Details'];
      const rows = auditList.map((a) => [a.ts ? new Date(a.ts).toLocaleString('en-US') : '', a.actor, a.role, a.action, a.details]);
      run('audit-trails', 'Audit', 'Audit Trails', header, rows, 'Recorded entries, exits & reports');
    } else {
      alert('Nothing to export on this view yet.');
    }
  };

  const Header = () => (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h1 className="text-3xl font-extrabold text-teal-800">Reports</h1>
        <p className="text-sm text-ink/60">Generated reports and long-term analytics.</p>
      </div>
      {view !== 'overview' && (
        <div className="flex gap-2">
          <button onClick={() => doExport('pdf')} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-medium text-ink whitespace-nowrap"><FileDown size={16} /> Export PDF</button>
          <button onClick={() => doExport('excel')} className="flex items-center gap-2 text-white rounded-full px-4 py-2 shadow-sm text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}><FileSpreadsheet size={16} /> Export Excel</button>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <Header />

      {/* OVERVIEW */}
      {view === 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="rounded-2xl p-6 flex items-center justify-between mb-6"
               style={{ background: 'linear-gradient(135deg,#0E2A2E 0%,#2E8C7E 100%)' }}>
            <div className="text-white">
              <p className="text-3xl font-extrabold">{overview.monthLabel || '—'}</p>
              <p className="text-sm text-white/70">Monthly Overview</p>
              <p className="text-[11px] text-white/50 italic mt-2">Snapshot of the current month at a glance.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/95 rounded-2xl px-6 py-3 text-center min-w-[110px]">
                <p className="text-[10px] font-semibold text-ink/50">Total Visitors</p>
                <p className="text-3xl font-extrabold text-ink">{overview.totalVisitors}</p>
              </div>
              <div className="bg-white/95 rounded-2xl px-6 py-3 text-center min-w-[110px]">
                <p className="text-[10px] font-semibold text-ink/50">Total Deliveries</p>
                <p className="text-3xl font-extrabold text-ink">{overview.totalDeliveries}</p>
              </div>
              <div className="rounded-2xl px-6 py-3 text-center min-w-[110px] text-white" style={{ backgroundColor: '#1E7E7E' }}>
                <p className="text-[10px] font-semibold text-white/70">Peak Day</p>
                <p className="text-2xl font-extrabold">{fmtDay(overview.peakDay)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REPORT_CARDS.map((c) => (
              <div key={c.key} className="rounded-2xl p-5 shadow-sm flex items-center gap-4" style={{ backgroundColor: '#F5F2E9' }}>
                <div className="flex-1">
                  <p className="font-bold text-ink">{c.title}</p>
                  <p className="text-xs text-ink/60 mb-3">{c.desc}</p>
                  <button onClick={() => setView(c.key)}
                          className="text-ink text-sm font-medium px-8 py-2 rounded-full bg-white border border-gray-200 shadow-sm whitespace-nowrap">View</button>
                </div>
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm"><c.Icon size={26} className="text-teal-700" /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTHLY */}
      {view === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-ink">Monthly Report</h3>
              <p className="text-xs text-ink/60">Total visitors, trends, peak visitation days.</p>
            </div>
            <button onClick={() => setShowGen(true)} className="text-white text-sm font-medium px-6 py-2 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>Summary</button>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4 mt-3">
            <p className="text-center font-bold text-teal-800 mb-3">
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

          <div className="grid grid-cols-4 gap-2 mt-5 mb-2">
            {['MONTH', 'VISITORS', 'DELIVERIES', 'TOTAL'].map((h, i) => (
              <span key={h} className={`text-[11px] font-semibold text-white px-4 py-2 rounded-lg ${i > 0 ? 'text-center' : ''}`} style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
            ))}
          </div>
          {table.map((m, i) => (
            <div key={i} className={`grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 text-sm ${i === 0 ? 'rounded-xl' : ''}`}
                 style={i === 0 ? { backgroundColor: '#CFEDE4' } : {}}>
              <span className="font-semibold text-ink">{m.fullLabel}</span>
              <span className="text-center text-ink/80">{m.visitors}</span>
              <span className="text-center text-ink/80">{m.deliveries}</span>
              <span className="text-center font-semibold text-ink">{m.total}</span>
            </div>
          ))}

          <div className="flex justify-end mt-5">
            <button onClick={() => setView('overview')} className="text-white text-sm font-medium px-6 py-2 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
          </div>
        </div>
      )}

      {/* COMPLAINTS */}
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
                <h3 className="font-bold text-ink">Complaints</h3>
                <p className="text-xs text-ink/60">Resident complaints & guard-filed reports — acknowledge from here.</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-medium px-6 py-2 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            {/* Toggle: Resident vs Guard complaints */}
            <div className="flex gap-2 mb-5">
              <button onClick={() => setCompSource('resident')}
                      className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
                      style={compSource === 'resident' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
                Resident Complaints
              </button>
              <button onClick={() => setCompSource('guard')}
                      className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
                      style={compSource === 'guard' ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
                Guard Complaints
              </button>
            </div>

            {compSource === 'resident' ? (<>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['Visitor', 'Guard', 'Security', 'HOA'].map((k) => (
                <div key={k} className="rounded-2xl px-4 py-3 text-center" style={{ backgroundColor: CAT_COLOR[k].bg }}>
                  <p className="text-2xl font-extrabold" style={{ color: CAT_COLOR[k].fg }}>{sum.byCategory ? (sum.byCategory[k] || 0) : 0}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: CAT_COLOR[k].fg }}>{k}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
              {cats.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)}
                        className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 whitespace-nowrap ${catFilter === c ? 'text-white' : 'bg-white text-ink border border-gray-200'}`}
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
                <Search size={18} className="text-ink/40" />
                <input value={compSearch} onChange={(e) => setCompSearch(e.target.value)}
                       placeholder="Search subject, type, resident..." className="flex-1 outline-none text-sm bg-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 mb-2">
              <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>CATEGORY</span>
              <span className="col-span-3 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>SUBJECT</span>
              <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>TYPE</span>
              <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>FILED BY</span>
              <span className="col-span-1 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DATE</span>
              <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>STATUS</span>
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
                        <span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{c.category}</span>
                      </span>
                      <span className="col-span-3 font-semibold text-ink truncate">{c.subject}
                        {c.blocklist ? <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3C9C9', color: '#9b2c2c' }}>BLOCKLIST</span> : null}
                      </span>
                      <span className="col-span-2 text-ink/70 text-xs truncate">{c.complaint_type}</span>
                      <span className="col-span-2 text-ink/70 text-xs truncate">{c.resident_name || '—'}</span>
                      <span className="col-span-1 text-ink/60 text-xs">{fmtDate(c.incident_date)}</span>
                      <span className="col-span-2 flex items-center gap-1">
                        <span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{c.status}</span>
                        {c.status === 'Resolved' && <CheckCircle2 size={13} className="text-green-600 shrink-0" title="Resolved by resident" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            </>) : (() => {
              // ── GUARD COMPLAINTS (guard-filed reports) — click → detail pop-up + acknowledge ──
              const GR_C = {
                'Security Concern': { bg: '#F3C9C9', fg: '#9b2c2c' },
                'Small Problem': { bg: '#F1D88A', fg: '#8a6d12' },
                'Incident': { bg: '#D9C2E9', fg: '#5b2c86' },
              };
              const GR_S = {
                Open: { bg: '#F1D88A', fg: '#8a6d12' },
                Acknowledged: { bg: '#CFE3F3', fg: '#1a5fa8' },
                Resolved: { bg: '#B4E4BE', fg: '#1e6b2e' },
              };
              const gq = compSearch.toLowerCase();
              const glist = (guardReports?.list || [])
                .filter((g) => compStatus === 'All' || g.status === compStatus)
                .filter((g) => !gq || (g.report_type || '').toLowerCase().includes(gq)
                  || (g.category || '').toLowerCase().includes(gq)
                  || (g.guard_name || '').toLowerCase().includes(gq));
              const gsum = guardReports?.summary?.byCategory || {};
              return (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {['Security Concern', 'Small Problem', 'Incident'].map((k) => (
                      <div key={k} className="rounded-2xl px-4 py-3 text-center" style={{ backgroundColor: GR_C[k].bg }}>
                        <p className="text-2xl font-extrabold" style={{ color: GR_C[k].fg }}>{gsum[k] || 0}</p>
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: GR_C[k].fg }}>{k}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center mb-4">
                    <select value={compStatus} onChange={(e) => setCompStatus(e.target.value)}
                            className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-ink outline-none">
                      {['All', 'Open', 'Acknowledged', 'Resolved'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                    </select>
                    <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 flex-1 min-w-[180px]" style={{ backgroundColor: '#F5F2E9' }}>
                      <Search size={18} className="text-ink/40" />
                      <input value={compSearch} onChange={(e) => setCompSearch(e.target.value)}
                             placeholder="Search type, category, guard..." className="flex-1 outline-none text-sm bg-transparent" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <span className="col-span-3 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>CATEGORY</span>
                    <span className="col-span-4 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>TYPE OF CONCERN</span>
                    <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>GUARD</span>
                    <span className="col-span-1 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DATE</span>
                    <span className="col-span-2 text-[11px] font-semibold text-white px-3 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>STATUS</span>
                  </div>
                  {glist.length === 0 ? (
                    <p className="text-center text-ink/50 py-10 text-sm">No guard complaints found.</p>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto">
                      {glist.map((g) => {
                        const cc = GR_C[g.category] || { bg: '#eee', fg: '#555' };
                        const sc = GR_S[g.status] || GR_S.Open;
                        return (
                          <button key={g.report_id} onClick={() => openGuardDetail(g)}
                                  className="w-full text-left grid grid-cols-12 gap-2 px-3 py-3 border-b border-gray-100 text-sm items-center hover:bg-gray-50">
                            <span className="col-span-3">
                              <span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{g.category}</span>
                            </span>
                            <span className="col-span-4 font-semibold text-ink truncate">{g.report_type}</span>
                            <span className="col-span-2 text-ink/70 text-xs truncate">{g.guard_name || '—'}</span>
                            <span className="col-span-1 text-ink/60 text-xs">{g.created_at ? fmtDate(g.created_at) : '—'}</span>
                            <span className="col-span-2">
                              <span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{g.status}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* INCIDENT MONITORING */}
      {view === 'incident' && (() => {
        const GR_COLOR = {
          'Security Concern': { bg: '#F3C9C9', fg: '#9b2c2c' },
          'Small Problem': { bg: '#F1D88A', fg: '#8a6d12' },
          'Incident': { bg: '#D9C2E9', fg: '#5b2c86' },
        };
        const sum = guardReports?.summary?.byCategory || {};
        const list = guardReports?.list || [];
        const cards = [
          ['Security Concern', sum['Security Concern'] || 0],
          ['Small Problem', sum['Small Problem'] || 0],
          ['Incident', sum['Incident'] || 0],
        ];
        return (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-ink">Incident Monitoring</h3>
                <p className="text-xs text-ink/60">Reports filed by guards (Security Concern · Small Problem · Incident).</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-medium px-6 py-2 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 mb-6">
              {cards.map(([label, n]) => (
                <div key={label} className="rounded-2xl px-4 py-4 text-center" style={{ backgroundColor: GR_COLOR[label].bg }}>
                  <p className="text-3xl font-extrabold" style={{ color: GR_COLOR[label].fg }}>{n}</p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: GR_COLOR[label].fg }}>{label}</p>
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold text-ink mb-2">Guard Reports</p>
            {list.length === 0 ? (
              <p className="text-center text-ink/50 py-10 text-sm">No guard reports yet.</p>
            ) : (
              <div className="max-h-[52vh] overflow-y-auto space-y-3">
                {list.map((g) => {
                  const cc = GR_COLOR[g.category] || { bg: '#eee', fg: '#555' };
                  const GR_STATUS = {
                    Open: { bg: '#F1D88A', fg: '#8a6d12' },
                    Acknowledged: { bg: '#CFE3F3', fg: '#1a5fa8' },
                    Resolved: { bg: '#B4E4BE', fg: '#1e6b2e' },
                  };
                  const sc = GR_STATUS[g.status] || GR_STATUS.Open;
                  const expanded = grThread === g.report_id;
                  return (
                    <div key={g.report_id} className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{g.category}</span>
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.fg }}>{g.status}</span>
                      </div>
                      <p className="font-semibold text-ink text-sm">{g.report_type}</p>
                      <p className="text-xs text-ink/60 mt-0.5 inline-flex items-center gap-1 flex-wrap">
                        <span>By {g.guard_name || '—'}</span>
                        {g.location && (<span className="inline-flex items-center gap-0.5"><span>·</span><MapPin size={12} className="text-ink/40" /> {g.location}</span>)}
                        <span>· {g.created_at ? new Date(g.created_at).toLocaleString('en-US') : ''}</span>
                      </p>

                      <button onClick={() => setGrThread(expanded ? null : g.report_id)}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                        <MessageSquare size={13} /> {expanded ? 'Hide thread' : 'View thread'}
                      </button>
                      {expanded && g.description && (
                        <div className="rounded-xl px-3 py-2 mt-2" style={{ backgroundColor: '#F5F2E9' }}>
                          <p className="text-xs text-ink whitespace-pre-wrap">{g.description}</p>
                        </div>
                      )}

                      {g.status === 'Resolved' && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                          <CheckCircle2 size={13} /> Marked resolved by the guard.
                        </div>
                      )}
                      {g.status === 'Open' && (
                        <button onClick={async () => {
                                  try { await adminAckGuardReport(g.report_id); const r = await adminGuardReports(); setGuardReports(r.data || { list: [], summary: {} }); }
                                  catch { alert('Failed to acknowledge.'); }
                                }}
                                className="mt-3 block text-xs font-semibold px-4 py-2 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
                          Acknowledge
                        </button>
                      )}
                      {g.status === 'Acknowledged' && (
                        <p className="text-[11px] text-ink/50 mt-2 italic">Acknowledged. Waiting for the guard to mark it resolved.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* AUDIT TRAILS — konektado sa Recent Activity + Reports */}
      {view === 'audit' && (() => {
        const s = audit?.summary || {};
        const q = auditSearch.toLowerCase();
        const list = auditList.filter((row) =>
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
                <h3 className="font-bold text-ink">Audit Trails</h3>
                <p className="text-xs text-ink/60">Recorded entries, exits, and reports — {s.monthLabel || 'this month'}.</p>
              </div>
              <button onClick={() => setView('overview')} className="text-white text-sm font-medium px-6 py-2 rounded-full whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
            </div>

            {/* Summary cards — Total Records = Entries + Exits + Reports */}
            <div className="grid grid-cols-4 gap-3 mt-4 mb-5">
              {[
                ['Total Records', s.total ?? list.length, '#CFEDE4', '#0F6E6E'],
                ['Entries Logged', s.entries ?? 0, '#DCF3E4', '#1e6b2e'],
                ['Exits Logged', s.exits ?? 0, '#F3C9C9', '#9b2c2c'],
                ['Reports', s.reports ?? 0, '#F1D88A', '#8a6d12'],
              ].map(([label, n, bg, fg]) => (
                <div key={label} className="rounded-2xl px-4 py-4 text-center" style={{ backgroundColor: bg }}>
                  <p className="text-3xl font-extrabold" style={{ color: fg }}>{n}</p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: fg }}>{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-4 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
              <Search size={18} className="text-ink/40" />
              <input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)}
                     placeholder="Search actor, action, details..."
                     className="flex-1 outline-none text-sm bg-transparent" />
            </div>

            <div className="grid grid-cols-12 gap-2 mb-2">
              <span className="col-span-3 text-[11px] font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DATE &amp; TIME</span>
              <span className="col-span-3 text-[11px] font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>ACTOR</span>
              <span className="col-span-2 text-[11px] font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>ACTION</span>
              <span className="col-span-4 text-[11px] font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>DETAILS</span>
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
                        <span className="font-semibold text-ink">{row.actor}</span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: rc.bg, color: rc.fg }}>{row.role}</span>
                      </span>
                      <span className="col-span-2 font-medium text-ink/80 text-xs">{row.action}</span>
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
            <button onClick={() => setShowGen(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center"><X size={16} /></button>
            <h2 className="text-lg font-extrabold text-ink mb-1 flex items-center gap-2"><FileDown size={18} /> Generate — Monthly Report</h2>
            <p className="text-xs text-ink/60 mb-4">
              Generated for {overview.monthLabel}. Includes month-over-month trend, total entries, and peak visitation days.
            </p>
            <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#F5F2E9' }}>
              <span className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>Highlights</span>
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

      {/* Complaint DETAIL + RESOLVE modal (thread) */}
      {resolveTarget && (() => {
        const c = resolveTarget;
        const cc = CAT_COLOR[c.category] || { bg: '#eee', fg: '#555' };
        const presets = RESOLUTIONS[c.category] || [];
        const isResolved = c.status === 'Resolved';
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setResolveTarget(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setResolveTarget(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center"><X size={16} /></button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{c.category} Complaint</span>
                {c.blocklist ? <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#F3C9C9', color: '#9b2c2c' }}>Blocklist requested</span> : null}
              </div>
              <h2 className="text-lg font-extrabold text-ink">{c.subject}</h2>
              <p className="text-xs text-ink/60 mb-3">{c.complaint_type} · Incident: {fmtDate(c.incident_date)} · Filed by {c.resident_name || '—'}{c.unit_address ? ` (${c.unit_address})` : ''}</p>

              {isResolved && (
                <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2" style={{ backgroundColor: '#E3F5E9', color: '#1e6b2e' }}>
                  <CheckCircle2 size={16} /> <span className="text-sm font-semibold">Marked as Resolved by the resident.</span>
                </div>
              )}

              {/* THREAD — conversation history (resident ↔ admin) */}
              {c.description && (
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-semibold text-ink/50 mb-1">THREAD</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{c.description}</p>
                </div>
              )}

              {!isResolved && (<>
                <p className="text-[10px] font-semibold text-ink/60 mb-1">SUGGESTED RESOLUTIONS</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {presets.map((p) => (
                    <button key={p} type="button" onClick={() => setResolText(p)}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-gray-200 text-ink hover:border-teal-500">
                      {p}
                    </button>
                  ))}
                </div>

                <label className="block text-[10px] font-semibold text-ink/60 mb-1">ACKNOWLEDGEMENT / RESPONSE (nakikita ng resident)</label>
                <textarea value={resolText} onChange={(e) => setResolText(e.target.value)} rows={3}
                          placeholder="Type or pick a response above…"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none mb-3" />

                {c.category === 'Visitor' && c.blocklist ? (
                  <button type="button" onClick={() => setApproveBl(!approveBl)}
                          className="w-full flex items-center justify-between rounded-xl px-4 py-3 mb-4 border"
                          style={{ borderColor: approveBl ? '#9b2c2c' : '#e5e7eb', backgroundColor: approveBl ? '#F3C9C9' : '#fff' }}>
                    <span className="text-sm font-semibold text-ink text-left">Allow blocklist request<br /><span className="text-[11px] font-normal text-ink/60">Idadagdag si "{c.subject}" sa blocklist ng resident.</span></span>
                    <span className="w-10 h-6 rounded-full flex items-center px-0.5" style={{ backgroundColor: approveBl ? '#9b2c2c' : '#d1d5db', justifyContent: approveBl ? 'flex-end' : 'flex-start' }}>
                      <span className="w-5 h-5 rounded-full bg-white" />
                    </span>
                  </button>
                ) : null}

                <div className="rounded-xl px-4 py-3 mb-5 text-xs" style={{ backgroundColor: '#F5F2E9', color: '#5b4a2e' }}>
                  Saving will mark the complaint <span className="font-semibold">Acknowledged</span> and notify the resident.
                  Only the resident can mark it <span className="font-semibold">Resolved</span>; kung hindi pa ayos, ire-resubmit nila ito sa thread.
                </div>
              </>)}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setResolveTarget(null)} className="px-6 py-2 rounded-full text-sm font-medium text-ink border border-gray-300">Close</button>
                {!isResolved && (
                  <button onClick={saveResolve} disabled={savingResol}
                          className="px-6 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60 whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
                    {savingResol ? 'Saving…' : 'Acknowledge'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* GUARD COMPLAINT detail + acknowledge modal (same process as resident) */}
      {grTarget && (() => {
        const GR_C = {
          'Security Concern': { bg: '#F3C9C9', fg: '#9b2c2c' },
          'Small Problem': { bg: '#F1D88A', fg: '#8a6d12' },
          'Incident': { bg: '#D9C2E9', fg: '#5b2c86' },
        };
        const g = grTarget;
        const cc = GR_C[g.category] || { bg: '#eee', fg: '#555' };
        const isOpen = g.status === 'Open';
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setGrTarget(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setGrTarget(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center"><X size={16} /></button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: cc.bg, color: cc.fg }}>{g.category}</span>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={g.status === 'Resolved' ? { backgroundColor: '#B4E4BE', color: '#1e6b2e' } : g.status === 'Acknowledged' ? { backgroundColor: '#CFE3F3', color: '#1a5fa8' } : { backgroundColor: '#F1D88A', color: '#8a6d12' }}>{g.status}</span>
              </div>
              <h2 className="text-lg font-extrabold text-ink">{g.report_type}</h2>
              <p className="text-xs text-ink/60 mb-3">
                Filed by {g.guard_name || '—'}{g.location ? ' · ' : ''}{g.location ? <span className="inline-flex items-center gap-0.5"><MapPin size={12} className="text-ink/40" /> {g.location}</span> : null} · {g.created_at ? new Date(g.created_at).toLocaleString('en-US') : ''}
              </p>

              {g.status === 'Resolved' && (
                <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2" style={{ backgroundColor: '#E3F5E9', color: '#1e6b2e' }}>
                  <CheckCircle2 size={16} /> <span className="text-sm font-semibold">Marked as Resolved by the guard.</span>
                </div>
              )}

              {g.description && (
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-semibold text-ink/50 mb-1">THREAD</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{g.description}</p>
                </div>
              )}

              {isOpen && (<>
                <label className="block text-[10px] font-semibold text-ink/60 mb-1">ACKNOWLEDGEMENT / RESPONSE (nakikita ng guard)</label>
                <textarea value={ackNote} onChange={(e) => setAckNote(e.target.value)} rows={3}
                          placeholder="Optional note to the guard…"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none mb-3" />
                <div className="rounded-xl px-4 py-3 mb-5 text-xs" style={{ backgroundColor: '#F5F2E9', color: '#5b4a2e' }}>
                  Saving will mark the report <span className="font-semibold">Acknowledged</span> and notify the guard.
                  Only the guard can mark it <span className="font-semibold">Resolved</span>; kung hindi pa ayos, ire-resubmit nila ito sa thread.
                </div>
              </>)}
              {g.status === 'Acknowledged' && (
                <p className="text-xs text-ink/50 italic mb-4">Acknowledged. Waiting for the guard to mark it resolved.</p>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setGrTarget(null)} className="px-6 py-2 rounded-full text-sm font-medium text-ink border border-gray-300">Close</button>
                {isOpen && (
                  <button onClick={saveGuardAck} disabled={savingAck}
                          className="px-6 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60 whitespace-nowrap" style={{ backgroundColor: '#0F6E6E' }}>
                    {savingAck ? 'Saving…' : 'Acknowledge'}
                  </button>
                )}
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
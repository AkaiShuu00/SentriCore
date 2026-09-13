import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { adminMonthlyReport, adminRecurrentReport } from '../../api';

const REPORT_CARDS = [
  { key: 'monthly',   title: 'Monthly Report',      desc: 'Total visitors, trends, peak visitation days.', icon: '📈' },
  { key: 'recurrent', title: 'Recurrent Visitor',   desc: 'Recurring riders, frequently visiting peoples.', icon: '🔁' },
  { key: 'incident',  title: 'Incident Monitoring', desc: 'Rejected entries, unresolved exits.', icon: '🛡️' },
  { key: 'audit',     title: 'Audit Trails',        desc: 'Track all system actions.', icon: '🕐' },
];

const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—';

export default function AdminReports() {
  const [view, setView] = useState('overview');
  const [showGen, setShowGen] = useState(false);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recurrent, setRecurrent] = useState(null);

  useEffect(() => {
    adminMonthlyReport()
      .then((res) => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
    adminRecurrentReport()
      .then((res) => setRecurrent(res.data))
      .catch(() => setRecurrent(null));
  }, []);

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
    } else if (view === 'recurrent') {
      const header = ['Name', 'Resident', 'Type', 'Unit', 'YTD Visits', 'This Month'];
      const rows = (recurrent?.list || []).map((r) => [r.name, r.resident, r.type, r.unit, r.ytd, r.thisMonth]);
      type === 'pdf' ? exportPDF('Recurrent Visitor', header, rows) : exportCSV('recurrent-visitor.csv', header, rows);
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

      {/* RECURRENT VISITOR */}
      {view === 'recurrent' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 mb-4 max-w-md" style={{ backgroundColor: '#F5F2E9' }}>
            <span className="text-ink/40">🔍</span>
            <input placeholder="Search name, resident..." className="flex-1 outline-none text-sm bg-transparent" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-ink">Recurrent Visitor</h3>
              <p className="text-xs text-ink/60">Recurring riders, frequently visiting individuals.</p>
            </div>
            <button onClick={() => setShowGen(true)} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>Summary</button>
          </div>

          {/* Table (walang graph) */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            {['NAME', 'RESIDENT', 'TYPE', 'UNIT', 'YTD VISITS', 'THIS MONTH'].map((h, i) => (
              <span key={h} className={`text-[11px] font-bold text-white px-4 py-2 rounded-lg ${i >= 4 ? 'text-center' : ''}`} style={{ backgroundColor: '#3a4a4a' }}>{h}</span>
            ))}
          </div>
          {(recurrent?.list || []).length === 0 ? (
            <p className="text-center text-ink/50 py-10 text-sm">No recurrent visitors yet.</p>
          ) : recurrent.list.map((r, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-bold text-ink">{r.name}</span>
              <span className="text-ink/70">{r.resident}</span>
              <span className="text-ink/70">{r.type}</span>
              <span className="text-ink/70">{r.unit}</span>
              <span className="text-center text-ink/80">{r.ytd}</span>
              <span className="text-center font-bold">{r.thisMonth}</span>
            </div>
          ))}

          <div className="flex justify-end mt-5">
            <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
          </div>
        </div>
      )}

      {/* Other views — placeholder (susunod na i-connect) */}
      {['incident', 'audit'].includes(view) && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink capitalize">{view} Report</h3>
            <button onClick={() => setView('overview')} className="text-white text-sm font-bold px-6 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>← Back</button>
          </div>
          <p className="text-center text-ink/50 py-16 text-sm">This report will be connected next.</p>
        </div>
      )}

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

      {/* Generate summary modal (Recurrent) */}
      {showGen && view === 'recurrent' && recurrent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowGen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGen(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center">✕</button>
            <h2 className="text-lg font-extrabold text-ink mb-1">📄 Generate — Recurrent Visitor</h2>
            <p className="text-xs text-ink/60 mb-4">
              Generated for {recurrent.summary.monthLabel}. Year-to-date frequent visitors with current-month highlight.
            </p>
            <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#F5F2E9' }}>
              <span className="text-xs font-bold text-white px-4 py-1.5 rounded-lg" style={{ backgroundColor: '#3a4a4a' }}>Highlights</span>
              <ul className="space-y-2 mt-3">
                <li className="text-sm text-ink flex gap-2"><span>•</span>Top repeat: {recurrent.summary.topName} ({recurrent.summary.topYtd} visits YTD)</li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>{recurrent.summary.topThisMonth} visits this month from top repeat</li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>{recurrent.summary.frequentCount} individuals classified as 'frequent'</li>
                <li className="text-sm text-ink flex gap-2"><span>•</span>{recurrent.summary.dominantType}s dominate top 3</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {loading && view === 'overview' && (
        <p className="text-center text-ink/40 text-sm mt-4">Loading report data…</p>
      )}
    </AdminLayout>
  );
}
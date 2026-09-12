import { useState } from 'react';
import AdminLayout from './components/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Sample data (iko-connect sa DB after) ──
const MONTHLY_CHART = [
  { month: 'Jan', visitors: 1520, deliveries: 740 },
  { month: 'Feb', visitors: 1810, deliveries: 690 },
  { month: 'Mar', visitors: 2034, deliveries: 812 },
  { month: 'Apr', visitors: 2287, deliveries: 909 },
  { month: 'May', visitors: 2418, deliveries: 942 },
];
const MONTHLY_TABLE = [
  { month: 'MAY 2026', visitors: 2418, deliveries: 942, total: 3360 },
  { month: 'APRIL 2026', visitors: 2287, deliveries: 909, total: 3196 },
  { month: 'MARCH 2026', visitors: 2034, deliveries: 812, total: 2846 },
  { month: 'FEBRUARY 2026', visitors: 1810, deliveries: 690, total: 2500 },
  { month: 'JANUARY 2026', visitors: 1520, deliveries: 748, total: 2268 },
];

const RECURRENT_CHART = [
  { month: 'Jan', visits: 60 }, { month: 'Feb', visits: 95 }, { month: 'Mar', visits: 120 },
  { month: 'Apr', visits: 130 }, { month: 'May', visits: 142 },
];
const RECURRENT_TABLE = [
  { name: 'Juan Dela Cruz', type: 'Driver', unit: 'Multiple', ytd: 73, month: 6 },
  { name: 'Andrea Pedrejas', type: 'Visitor', unit: 'Unit C-8', ytd: 68, month: 9 },
  { name: 'Bel Magpantay', type: 'Visitor', unit: 'Unit C-13', ytd: 44, month: 3 },
  { name: 'Mary-Del Mercado', type: 'Delivery', unit: 'Multiple', ytd: 142, month: 19 },
  { name: 'Sona Gordo', type: 'Visitor', unit: 'Unit B-12', ytd: 21, month: 5 },
];

const INCIDENTS = Array.from({ length: 8 }).map((_, i) => ({
  date: 'May 21, 10:17 AM',
  type: ['Driver', 'Visitor', 'Delivery'][i % 3],
  name: 'Juan Dela Cruz',
  note: ['Unregistered visitor – Gate A', 'Pass P-0921 never logged out', 'Suspicious vehicle plate mismatch'][i % 3],
}));

const AUDIT = Array.from({ length: 10 }).map((_, i) => ({
  date: 'May 21, 10:17 AM',
  type: i % 2 === 0 ? 'Guard' : 'Resident',
  name: 'Juan Dela Cruz',
  note: ['Registered visitor entry P-1052', 'Registered 2 visitors', 'Logged visitor exit P-1052', 'Registered 10 visitors'][i % 4],
}));

const REPORT_CARDS = [
  { key: 'monthly',   title: 'Monthly Report',      desc: 'Total visitors, trends, peak visitation days', icon: '📈' },
  { key: 'recurrent', title: 'Recurrent Visitor',   desc: 'Recurring visitors, frequently visiting people', icon: '🔁' },
  { key: 'incident',  title: 'Incident Monitoring', desc: 'Rejected entries, unresolved exits', icon: '🛡️' },
  { key: 'audit',     title: 'Audit Trails',        desc: 'Guard & resident action accountability', icon: '📝' },
];

export default function AdminReports() {
  const [view, setView] = useState('overview'); // overview | monthly | recurrent | incident | audit
  const [showGen, setShowGen] = useState(false);
  const [auditTab, setAuditTab] = useState('All');

  const genContent = {
    monthly: { title: 'Generate — Monthly Report', sub: 'Generated for May 2026. Includes month-over-month trend, total entries, and peak visitation days.',
      items: ['2,418 total visitors (+5.7% vs Apr)', '942 deliveries logged', 'Peak day: May 18 (148 entries)', 'Avg. daily visitors: 78'] },
    recurrent: { title: 'Generate — Recurrent Visitor', sub: 'Generated for May 2026. Year-to-date frequent visitors with current-month highlight.',
      items: ['Top repeat: Mary-Del Mercado (142 visits YTD)', '19 visits this month from top repeat', "7 individuals classified as 'frequent'", 'Visitors dominate top 3'] },
    incident: { title: 'Generate — Incident Monitoring', sub: 'Generated for May 2026. Includes rejections, incident reports, and unresolved exit pending review.',
      items: ['6 incidents this month', '2 rejected entries', '1 unresolved exit pending review'] },
    audit: { title: 'Generate — Audit Trails', sub: 'Generated for May 2026. Guard & resident actions for accountability.',
      items: ['312 total actions logged', '198 guard actions', '114 resident actions'] },
  };

  const Header = ({ title }) => (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Reports</h1>
        <p className="text-sm text-ink/60">Generated space and long-term analytics</p>
      </div>
      <div className="flex gap-2">
        {view !== 'overview' && (
          <button onClick={() => setShowGen(true)} className="text-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>Summary</button>
        )}
        <button className="bg-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-ink">Export PDF</button>
        <button className="text-white rounded-full px-4 py-2 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>Export Excel</button>
      </div>
    </div>
  );

  const Th = ({ children, center }) => <span className={`text-[11px] font-bold text-white ${center ? 'text-center' : ''}`}>{children}</span>;

  return (
    <AdminLayout>
      <Header />

      {/* OVERVIEW */}
      {view === 'overview' && (
        <>
          <div className="rounded-2xl p-6 shadow-sm text-white flex items-center justify-between mb-6"
               style={{ background: 'linear-gradient(135deg,#0F5E5E,#7FB0AE)' }}>
            <div>
              <p className="text-3xl font-extrabold">May 2026</p>
              <p className="text-sm text-white/70">Monthly Overview</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white rounded-2xl px-6 py-3 text-center">
                <p className="text-2xl font-extrabold text-ink">1234</p><p className="text-[10px] font-bold text-ink/50">Total Visitors</p>
              </div>
              <div className="bg-white rounded-2xl px-6 py-3 text-center">
                <p className="text-2xl font-extrabold text-ink">676</p><p className="text-[10px] font-bold text-ink/50">Total Deliveries</p>
              </div>
              <div className="rounded-2xl px-6 py-3 text-center text-white" style={{ backgroundColor: '#0E2A2E' }}>
                <p className="text-2xl font-extrabold">May 20</p><p className="text-[10px] font-bold text-white/60">Peak Day</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REPORT_CARDS.map((c) => (
              <div key={c.key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-2xl">{c.icon}</div>
                <div className="flex-1">
                  <p className="font-extrabold text-ink">{c.title}</p>
                  <p className="text-xs text-ink/60">{c.desc}</p>
                </div>
                <button onClick={() => setView(c.key)} className="text-white text-sm font-bold px-5 py-2 rounded-full" style={{ backgroundColor: '#0F6E6E' }}>View</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MONTHLY */}
      {view === 'monthly' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink">January to May Report</h3>
            <button onClick={() => setView('overview')} className="text-xs font-bold text-teal-700">← Back</button>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={MONTHLY_CHART}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="visitors" fill="#0F6E6E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deliveries" fill="#7FB0AE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-ink text-white text-[11px] font-bold rounded-xl mt-4">
            <span>MONTH</span><span className="text-center">VISITORS</span><span className="text-center">DELIVERIES</span><span className="text-center">TOTAL</span>
          </div>
          {MONTHLY_TABLE.map((m, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink">
              <span className="font-semibold">{m.month}</span>
              <span className="text-center text-ink/70">{m.visitors}</span>
              <span className="text-center text-ink/70">{m.deliveries}</span>
              <span className="text-center font-bold">{m.total}</span>
            </div>
          ))}
        </div>
      )}

      {/* RECURRENT */}
      {view === 'recurrent' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink">January to May Report</h3>
            <button onClick={() => setView('overview')} className="text-xs font-bold text-teal-700">← Back</button>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={RECURRENT_CHART}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#0F6E6E" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-ink text-white text-[11px] font-bold rounded-xl mt-4">
            <span>NAME</span><span>TYPE</span><span>UNIT</span><span className="text-center">YTD VISITS</span><span className="text-center">THIS MONTH</span>
          </div>
          {RECURRENT_TABLE.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink">
              <span className="font-semibold">{r.name}</span>
              <span className="text-ink/70">{r.type}</span>
              <span className="text-ink/70">{r.unit}</span>
              <span className="text-center text-ink/70">{r.ytd}</span>
              <span className="text-center font-bold">{r.month}</span>
            </div>
          ))}
        </div>
      )}

      {/* INCIDENT */}
      {view === 'incident' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink">Incident Monitoring</h3>
            <button onClick={() => setView('overview')} className="text-xs font-bold text-teal-700">← Back</button>
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-ink text-white text-[11px] font-bold rounded-xl">
            <span>DATE</span><span>TYPE</span><span>NAME</span><span>NOTE</span>
          </div>
          {INCIDENTS.map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink">
              <span className="text-ink/70">{r.date}</span>
              <span className="text-ink/70">{r.type}</span>
              <span className="font-semibold">{r.name}</span>
              <span className="text-ink/70">{r.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* AUDIT */}
      {view === 'audit' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink">Audit Trails Reports</h3>
            <div className="flex gap-2">
              {['All', 'Guard', 'Resident'].map((t) => (
                <button key={t} onClick={() => setAuditTab(t)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold ${auditTab === t ? 'text-white' : 'bg-gray-100 text-ink'}`}
                        style={auditTab === t ? { backgroundColor: '#0F6E6E' } : {}}>{t}</button>
              ))}
              <button onClick={() => setView('overview')} className="text-xs font-bold text-teal-700 ml-2">← Back</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-ink text-white text-[11px] font-bold rounded-xl">
            <span>DATE</span><span>TYPE</span><span>NAME</span><span>NOTE</span>
          </div>
          {AUDIT.filter((a) => auditTab === 'All' || a.type === auditTab).map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 text-sm text-ink">
              <span className="text-ink/70">{r.date}</span>
              <span className="text-ink/70">{r.type}</span>
              <span className="font-semibold">{r.name}</span>
              <span className="text-ink/70">{r.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Generate summary modal */}
      {showGen && view !== 'overview' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowGen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-lg font-extrabold text-ink mb-1">📄 {genContent[view].title}</h2>
            <p className="text-xs text-ink/60 mb-4">{genContent[view].sub}</p>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#DCF3E4' }}>
              <p className="text-xs font-bold text-teal-800 mb-2">Highlights</p>
              <ul className="space-y-1">
                {genContent[view].items.map((it, i) => (
                  <li key={i} className="text-sm text-ink flex gap-2"><span>•</span>{it}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
import { useState } from 'react';
import AdminLayout from './components/AdminLayout';

const TABS = ['Guard List', 'Activity Logs', 'Schedule'];

// ── Sample data (iko-connect sa DB after) ──
const GUARDS = [
  { name: 'Carlos Aquino',    shift: '6:00 AM - 2:00 PM', gate: 'Gate 1', status: 'ON DUTY' },
  { name: 'Miguel Arriaga',   shift: '6:00 AM - 2:00 PM', gate: 'Gate 2', status: 'ON DUTY' },
  { name: 'Andrew Pumingas',  shift: '2:00 PM - 10:00 PM', gate: 'Gate 1', status: 'OFF DUTY' },
  { name: 'Mark Villanueva',  shift: '6:00 AM - 2:00 PM', gate: 'Gate 2', status: 'ON BREAK' },
];

const ACTIVITY = [
  { name: 'Carlos Aquino',   date: 'May 21, 10:16 AM', visitor: 'Juana Alberto', unit: 'Unit A-12', pass: 'P-1050', action: 'Entry' },
  { name: 'Miguel Arriaga',  date: 'May 21, 10:18 AM', visitor: 'Juana Alberto', unit: 'Unit B-8',  pass: 'P-1051', action: 'Exit' },
  { name: 'Andrew Pumingas', date: 'May 21, 10:20 AM', visitor: 'Juana Alberto', unit: 'Unit C-3',  pass: 'P-1052', action: 'Entry' },
  { name: 'Mark Villanueva', date: 'May 21, 10:24 AM', visitor: 'Juana Alberto', unit: 'Unit D-1',  pass: 'P-1053', action: 'Exit' },
];

const SCHEDULE = [
  { gate: 'GATE 1', guards: [
    { name: 'Mark Villanueva', shift: '6:00 AM - 2:00 PM', duty: 'ON DUTY' },
    { name: 'Anigade Sef Filan', shift: '2:00 PM - 10:00 PM', duty: 'OFF DUTY' },
  ]},
  { gate: 'GATE 2', guards: [
    { name: 'Sarah Genovino', shift: '6:00 AM - 2:00 PM', duty: 'ON DUTY' },
    { name: 'Taylor Swift', shift: '2:00 PM - 10:00 PM', duty: 'OFF DUTY' },
  ]},
];

const statusBg = {
  'ON DUTY':  { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  'OFF DUTY': { backgroundColor: '#D9D9D9', color: '#555' },
  'ON BREAK': { backgroundColor: '#F1D88A', color: '#8a6d12' },
};

export default function AdminGuards() {
  const [tab, setTab] = useState('Guard List');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Guards</h1>
          <p className="text-sm text-ink/60">Security personnel management</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-white rounded-full px-5 py-2.5 shadow-sm text-sm font-semibold" style={{ backgroundColor: '#0F6E6E' }}>
          + Add Guard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm flex-1">
          <span className="text-ink/40">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guard name"
                 className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
        </div>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-full text-sm font-bold shadow-sm ${tab === t ? 'text-white' : 'bg-white text-ink'}`}
                  style={tab === t ? { backgroundColor: '#0F6E6E' } : {}}>
            {t}
          </button>
        ))}
      </div>

      {/* Guard List */}
      {tab === 'Guard List' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-gray-50 text-[11px] font-bold text-ink/60">
            <span>Guard Name</span><span>Shift Schedule</span><span>Gate Assignment</span><span className="text-center">Status</span>
          </div>
          {GUARDS.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())).map((g, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-semibold">{g.name}</span>
              <span className="text-ink/70">{g.shift}</span>
              <span className="text-ink/70">{g.gate}</span>
              <span className="text-center">
                <span className="text-[9px] font-bold px-3 py-1 rounded-full" style={statusBg[g.status]}>{g.status}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Activity Logs */}
      {tab === 'Activity Logs' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-6 gap-2 px-6 py-3 bg-gray-50 text-[11px] font-bold text-ink/60">
            <span>Guard Name</span><span>Date and Time</span><span>Visitor Name</span>
            <span>Unit</span><span>Pass No.</span><span className="text-center">Action</span>
          </div>
          {ACTIVITY.map((a, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 px-6 py-4 border-b border-gray-100 text-sm text-ink items-center">
              <span className="font-semibold">{a.name}</span>
              <span className="text-ink/70">{a.date}</span>
              <span className="text-ink/70">{a.visitor}</span>
              <span className="text-ink/70">{a.unit}</span>
              <span className="font-bold">{a.pass}</span>
              <span className="text-center">
                <span className="text-[9px] font-bold px-3 py-1 rounded-full" style={a.action === 'Entry' ? statusBg['ON DUTY'] : { backgroundColor: '#F1D88A', color: '#8a6d12' }}>{a.action}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Schedule */}
      {tab === 'Schedule' && (
        <div className="grid grid-cols-2 gap-6">
          {SCHEDULE.map((g) => (
            <div key={g.gate} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="bg-ink text-white text-center font-bold py-2 rounded-xl mb-4">{g.gate}</div>
              {g.guards.map((gu, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-ink">{gu.name}</p>
                    <span className="text-[9px] font-bold px-3 py-1 rounded-full" style={statusBg[gu.duty]}>{gu.duty}</span>
                  </div>
                  <p className="text-xs text-ink/60">{gu.shift}</p>
                  <button className="text-[11px] font-bold text-teal-700 mt-2">⇄ Reassign Guard</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Guard modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink">✕</button>
            <h2 className="text-xl font-extrabold text-ink mb-5">Add Guard</h2>
            <div className="space-y-3">
              {[
                ['Full Name', 'Carlos Aquino'],
                ['Employee ID', 'GD-1001'],
                ['Contact Number', '0912 345 6789'],
                ['Email Address', 'guard@email.com'],
                ['Gate Assignment', 'Gate 1'],
                ['Shift Schedule', '6:00 AM - 2:00 PM'],
                ['Username', 'guard1'],
                ['Temporary Password', '••••••••'],
              ].map(([label, ph]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-ink mb-1">{label}</label>
                  <input placeholder={ph} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
              <button onClick={() => { alert('Guard added — iko-connect sa DB'); setShowAdd(false); }}
                      className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ backgroundColor: '#0F6E6E' }}>Add Guard</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
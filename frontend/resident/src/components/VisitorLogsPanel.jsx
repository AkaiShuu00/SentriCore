import { useState } from 'react';
import { Search, X, FileDown, FileSpreadsheet, Archive, Calendar, ArrowUpDown } from 'lucide-react';

const statusBg = {
  Active:    { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
  Completed: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Departed:  { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  Expired:   { backgroundColor: '#D9D9D9', color: '#555' },
};
const STATUSES = ['All Status', 'Active', 'Departed'];
const TABS = ['ALL', 'SINGLE', 'BATCH', 'LINKED', 'DELIVERY'];
const FLAT_TABS = ['ALL', 'SINGLE', 'DELIVERY'];

const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-----';
const fmtFullDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-----';
const minuteKey = (ts) => { if (!ts) return ''; const d = new Date(ts); if (isNaN(d)) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

function MemberRow({ l, onClick }) {
  return (
    <button onClick={onClick} className="w-full grid grid-cols-5 gap-1 px-3 py-3 items-center text-left hover:bg-cream/40">
      <div className="text-[10px] text-ink"><p className="font-bold">{fmtFullDate(l.entryTime)}</p><p className="text-ink/60">{fmt(l.entryTime)}</p></div>
      <div className="text-[10px] text-ink"><p className="font-bold truncate">{l.visitor}</p><p className="text-ink/60">{l.type}</p></div>
      <div className="text-[10px] text-ink text-center"><p className="font-bold truncate">{l.resident}</p><p className="text-ink/60 truncate">{l.unit}</p></div>
      <div className="text-center"><span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span></div>
      <div className="text-[10px] font-bold text-ink text-center">{l.pass}</div>
    </button>
  );
}

// Reusable logs panel — guard-style ALL/SINGLE/BATCH/LINKED/DELIVERY
// Props: records[], onExportPDF, onExportExcel (optional), heightClass
export default function VisitorLogsPanel({ records = [], onExportPDF, onExportExcel, heightClass = 'max-h-[52vh]' }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [dateFilter, setDateFilter] = useState('');
  const [sortAZ, setSortAZ] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [linkMode, setLinkMode] = useState('ENTRY');
  const [openBatch, setOpenBatch] = useState(null);
  const [detail, setDetail] = useState(null);

  const isBatch = (l) => String(l.regType) === 'Batch';
  const isDelivery = (l) => l.type === 'Delivery' || String(l.regType) === 'Delivery';
  const isSingle = (l) => !isBatch(l) && !isDelivery(l);

  let base = records
    .filter((l) => statusFilter === 'All Status' || l.status === statusFilter)
    .filter((l) => { const q = search.toLowerCase(); return !q || (l.visitor || '').toLowerCase().includes(q) || (l.pass || '').toLowerCase().includes(q) || (l.resident || '').toLowerCase().includes(q); })
    .filter((l) => !dateFilter || l.dateISO === dateFilter);
  if (sortAZ) base = [...base].sort((a, b) => (a.visitor || '').localeCompare(b.visitor || ''));

  const flat = tab === 'SINGLE' ? base.filter(isSingle) : tab === 'DELIVERY' ? base.filter(isDelivery) : base;

  const buildBatchGroups = () => {
    const map = new Map();
    base.filter(isBatch).forEach((l) => {
      const k = l.regId ? 'G' + l.regId : (l.batchName ? 'B' + l.batchName : 'R' + l.id);
      if (!map.has(k)) map.set(k, { key: k, batchNo: l.batchName || '—', members: [] });
      if (!map.get(k).batchNo || map.get(k).batchNo === '—') map.get(k).batchNo = l.batchName || map.get(k).batchNo;
      map.get(k).members.push(l);
    });
    const groups = Array.from(map.values());
    groups.forEach((g) => {
      g.when = g.members.reduce((mx, m) => Math.max(mx, new Date(m.entryTime || 0).getTime() || 0), 0);
      const aMap = new Map();
      g.members.filter((m) => m.entryTime).forEach((m) => { const ak = m.arrivalId ? 'A' + m.arrivalId : 'S' + m.id; if (!aMap.has(ak)) aMap.set(ak, { when: m.entryTime, members: [] }); aMap.get(ak).members.push(m); });
      g.arrivals = Array.from(aMap.values()).sort((a, b) => new Date(a.when) - new Date(b.when));
      const dMap = new Map();
      g.members.filter((m) => m.rawStatus === 'Completed' && m.exitTime).forEach((m) => { const dk = minuteKey(m.exitTime); if (!dMap.has(dk)) dMap.set(dk, { when: m.exitTime, members: [] }); dMap.get(dk).members.push(m); });
      g.departures = Array.from(dMap.values()).sort((a, b) => new Date(a.when) - new Date(b.when));
      g.activeCount = g.members.filter((m) => m.rawStatus === 'Active').length;
    });
    groups.sort((a, b) => b.when - a.when);
    return groups;
  };
  const batchGroups = tab === 'BATCH' ? buildBatchGroups() : [];

  const buildLinked = () => {
    const map = new Map();
    if (linkMode === 'ENTRY') {
      base.filter((l) => !isBatch(l)).forEach((l) => { if (!l.arrivalId) return; const k = 'A' + l.arrivalId; if (!map.has(k)) map.set(k, { key: k, when: l.entryTime, members: [] }); map.get(k).members.push(l); });
    } else {
      base.filter((l) => !isBatch(l)).forEach((l) => { if (l.rawStatus !== 'Completed' || !l.exitTime) return; const k = minuteKey(l.exitTime); if (!map.has(k)) map.set(k, { key: k, when: l.exitTime, members: [] }); map.get(k).members.push(l); });
    }
    let groups = Array.from(map.values()).filter((g) => g.members.length >= 2);
    groups.forEach((g) => { g.activeCount = g.members.filter((m) => m.rawStatus === 'Active').length; g.members.sort((a, b) => (a.rawStatus === b.rawStatus ? 0 : a.rawStatus === 'Active' ? -1 : 1)); });
    groups.sort((a, b) => new Date(b.when) - new Date(a.when));
    return groups;
  };
  const linkedGroups = tab === 'LINKED' ? buildLinked() : [];

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 rounded-full px-4 py-2 flex-1" style={{ backgroundColor: '#F5F2E9' }}>
          <Search size={16} className="text-ink/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visitor, pass..."
                 className="flex-1 outline-none text-sm text-ink placeholder-ink/40 bg-transparent" />
        </div>
        <button onClick={() => setSortAZ((v) => !v)} title="Sort A–Z"
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sortAZ ? 'text-white' : 'bg-white border border-gray-200 text-ink'}`}
                style={sortAZ ? { backgroundColor: '#0F6E6E' } : {}}><ArrowUpDown size={16} /></button>
        <label className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 cursor-pointer relative" title="Filter by date">
          <Calendar size={16} className="text-ink" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-full px-3 py-2 text-sm font-medium text-ink outline-none shrink-0 w-32 text-center">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(onExportPDF || onExportExcel) && (
          <div className="flex gap-1 shrink-0">
            {onExportPDF && <button onClick={() => onExportPDF(base)} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-ink" title="Export PDF"><FileDown size={16} /></button>}
            {onExportExcel && <button onClick={() => onExportExcel(base)} className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#0F6E6E' }} title="Export Excel"><FileSpreadsheet size={16} /></button>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setOpenBatch(null); }}
                  className="py-2 rounded-full text-xs font-bold text-center"
                  style={tab === t ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'LINKED' && (
        <div className="flex gap-2 mb-3">
          {['ENTRY', 'EXIT'].map((m) => (
            <button key={m} onClick={() => setLinkMode(m)} className="px-5 py-1.5 rounded-full text-xs font-bold"
                    style={linkMode === m ? { backgroundColor: '#0F6E6E', color: '#fff' } : { backgroundColor: '#fff', color: '#112D31', border: '1px solid #e5e7eb' }}>
              LINKED {m}
            </button>
          ))}
        </div>
      )}

      {/* FLAT */}
      {FLAT_TABS.includes(tab) && (<>
        <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[11px] font-semibold text-ink/60 border-b border-gray-200">
          <span>Visitor</span><span>Type</span><span>Entry</span><span>Exit</span><span className="text-center">Status</span><span>Pass</span>
        </div>
        <div className={`${heightClass} overflow-y-auto`}>
          {flat.length === 0 ? (<p className="text-center text-ink/50 py-10 text-sm">No logs found.</p>)
          : flat.map((l) => (
            <button key={l.id} onClick={() => setDetail(l)} className="w-full grid grid-cols-6 gap-2 px-3 py-2.5 border-b border-gray-100 text-xs text-ink items-center text-left hover:bg-cream/40">
              <span className="font-medium truncate">{l.visitor}</span>
              <span className="text-ink/70">{l.type}</span>
              <span className="text-ink/60">{l.entry}</span>
              <span className="text-ink/60">{l.exit}</span>
              <span className="text-center"><span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span></span>
              <span className="font-semibold">{l.pass}</span>
            </button>
          ))}
        </div>
      </>)}

      {/* BATCH */}
      {tab === 'BATCH' && (
        <div className={`${heightClass} overflow-y-auto space-y-3`}>
          {batchGroups.length === 0 ? (
            <div className="text-center py-10"><div className="flex justify-center mb-2"><Archive size={34} className="text-ink/40" /></div><p className="text-ink/60 font-semibold">No batch records found</p></div>
          ) : batchGroups.map((g) => {
            const isOpen = openBatch === g.key;
            return (
              <div key={g.key} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button onClick={() => setOpenBatch(isOpen ? null : g.key)} className="w-full flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white" style={{ color: '#0A4A4A' }}>BATCH #{g.batchNo}</span>
                    <span className="text-xs font-bold text-white/90 truncate">{g.members[0]?.resident}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white shrink-0">{g.members.length} visitors ▾</span>
                </button>
                {isOpen && (
                  <div className="p-3 space-y-3" style={{ backgroundColor: '#F7F5EE' }}>
                    {g.arrivals.map((a, ai) => (
                      <div key={'a' + ai} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: '#1e6b2e' }}>ARRIVAL {ai + 1} - {fmtFullDate(a.when)} - {a.members.length} visitor{a.members.length === 1 ? '' : 's'}</div>
                        <div className="divide-y divide-gray-100">{a.members.map((l) => <MemberRow key={l.id} l={l} onClick={() => setDetail(l)} />)}</div>
                      </div>
                    ))}
                    {g.departures.map((d, di) => (
                      <div key={'d' + di} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: '#8a2b2b' }}>DEPARTED {di + 1} - {fmtFullDate(d.when)} - {d.members.length} visitor{d.members.length === 1 ? '' : 's'}</div>
                        <div className="divide-y divide-gray-100">{d.members.map((l) => <MemberRow key={l.id} l={l} onClick={() => setDetail(l)} />)}</div>
                      </div>
                    ))}
                    {g.activeCount > 0 && <p className="text-[10px] text-ink/60 text-center">{g.activeCount} still inside (active)</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LINKED */}
      {tab === 'LINKED' && (
        <div className={`${heightClass} overflow-y-auto space-y-3`}>
          {linkedGroups.length === 0 ? (
            <p className="text-center text-ink/50 py-10 text-sm">No linked {linkMode === 'ENTRY' ? 'entries' : 'exits'} found.</p>
          ) : linkedGroups.map((g) => (
            <div key={g.key} className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#E8F0EE' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#0F6E6E' }}>LINKED {linkMode}</span>
                  <span className="text-xs font-bold text-ink">{g.members.length} people{linkMode === 'ENTRY' ? ` · ${g.activeCount} active` : ''}</span>
                </div>
                <span className="text-[11px] text-ink/60">{g.when ? fmt(g.when) : '—'}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {g.members.map((l) => (
                  <button key={l.id} onClick={() => setDetail(l)} className="w-full flex items-center justify-between px-4 py-2.5 gap-2 text-left hover:bg-cream/40">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{l.visitor}</p>
                      <p className="text-[11px] text-ink/60 truncate">{l.type} · {l.resident}</p>
                      <p className="text-[11px] text-ink/50">In: {fmtFullDate(l.entryTime)} · Out: {fmtFullDate(l.exitTime)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold text-ink">{l.pass}</p>
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-full inline-block mt-1" style={statusBg[l.rawStatus] || statusBg.Expired}>{l.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink"><X size={16} /></button>
            <h2 className="text-xl font-extrabold text-teal-800 mb-4">{detail.kind === 'delivery' ? 'Delivery Details' : 'Visitor Details'}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                ['Name', detail.visitor], ['Pass No.', detail.pass],
                ['Type', detail.type], ['Reg Type', detail.regType],
                ['Resident', detail.resident], ['Unit', detail.unit],
                ['Entry', detail.entry], ['Exit', detail.exit],
                ['Purpose', detail.purpose], ['Status', detail.status],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl px-3 py-2" style={{ backgroundColor: '#F5F2E9' }}>
                  <p className="text-[10px] font-semibold text-ink/40">{label}</p>
                  <p className="text-sm text-teal-800 font-medium">{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
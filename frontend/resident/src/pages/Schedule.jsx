import { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { getMyRegistrations, updateRegistration, deleteRegistration } from '../api';
import { User, Search, Inbox, Pencil, Trash2, X, CalendarDays } from 'lucide-react';

const FILTERS = ['ALL', 'ACTIVE', 'EXPECTED'];

export default function Schedule() {
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');
  // #4: reflect ang napiling avatar sa top nav
  const AVATARS = { male: '/avatars/male.png', female: '/avatars/female.png' };
  const avatarChoice = (() => { try { return localStorage.getItem('sentricore_avatar') || 'default'; } catch { return 'default'; } })();
  const avatarSrc = AVATARS[avatarChoice] || null;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // ── Real data from DB ──
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // #1: edit/delete modals
  const [editReg, setEditReg] = useState(null);   // { registrationId, purpose, expectedDate }
  const [delReg, setDelReg] = useState(null);     // { registrationId, name }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    getMyRegistrations()
      .then((res) => setRegistrations(res.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your visitors.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const year = today.getFullYear();
  const month = today.getMonth();

  // I-flatten ang registrations → isang row bawat visitor (per-visitor status)
  const allRows = registrations.flatMap((r) => {
    const isDelivery = r.registration_type === 'Delivery';
    const expDate = (r.expected_date || '').slice(0, 10);
    const vlist = r.visitors && r.visitors.length
      ? r.visitors
      : [{ name: isDelivery ? 'Delivery Rider' : '—', status: r.status || 'Expected' }];
    return vlist.map((v) => ({
      registrationId: r.registration_id,
      canManage: !!r.canManage,
      name: typeof v === 'string' ? v : v.name,
      type: isDelivery ? 'Delivery' : 'Visitor',
      purpose: r.purpose || (isDelivery ? 'Delivery' : 'N/A'),
      rawPurpose: r.purpose || '',
      status: (typeof v === 'string' ? (r.status || 'Expected') : v.status).toUpperCase(),
      expectedDate: expDate,
    }));
  }).filter((s) => s.status !== 'DEPARTED');

  const counts = {
    ALL: allRows.length,
    ACTIVE: allRows.filter((s) => s.status === 'ACTIVE').length,
    EXPECTED: allRows.filter((s) => s.status === 'EXPECTED').length,
  };

  const statusStyle = {
    ACTIVE: { backgroundColor: '#B4E4BE', color: '#1e6b2e' },
    EXPECTED: { backgroundColor: '#F1D88A', color: '#8a6d12' },
    DEPARTED: { backgroundColor: '#F3C9C9', color: '#8a2b2b' },
  };

  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    monthDays.push({ dayNum: i, dayLabel: DAY_LABELS[dateObj.getDay()] });
  }
  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const scrollDates = (dir) => {
    const el = document.getElementById('sched-day-scroll');
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = document.getElementById('sched-today-cell');
    if (el) el.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, [loading]);

  const selectedISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  const filtered = allRows
    .filter((s) => s.expectedDate === selectedISO)
    .filter((s) => filter === 'ALL' || s.status === filter)
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const prettyDate = new Date(year, month, selectedDay).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Para hindi doble ang Edit/Delete kung maraming bisita sa isang registration
  const shownManage = new Set();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const saveEdit = async () => {
    if (!editReg) return;
    setBusy(true);
    try {
      await updateRegistration(editReg.registrationId, {
        purpose: editReg.purpose,
        expectedDate: editReg.expectedDate,
      });
      setEditReg(null);
      showToast('Registration updated.');
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update registration.');
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!delReg) return;
    setBusy(true);
    try {
      await deleteRegistration(delReg.registrationId);
      setDelReg(null);
      showToast('Registration deleted.');
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete registration.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-cream pb-24 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6">
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-1 pr-5 py-1 shadow">
          <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center overflow-hidden">
            {avatarSrc
              ? <img src={avatarSrc} alt={user.name || 'Resident'} className="w-full h-full object-cover" />
              : <User size={20} className="text-white" />}
          </div>
          <span className="font-bold text-ink">{user.name || 'Resident'}</span>
        </div>
      </header>

      <div className="px-4">
        {/* Summary card */}
        <div className="rounded-3xl p-6 shadow-lg text-white mt-4"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <p className="font-bold tracking-wide">{monthYear.toUpperCase()}</p>
          <h1 className="text-3xl font-extrabold mb-5">Expected Visitors</h1>
          <div className="flex gap-2">
            {[
              { label: 'ALL', val: counts.ALL },
              { label: 'ACTIVE', val: counts.ACTIVE },
              { label: 'EXPECTED', val: counts.EXPECTED },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-black/15 rounded-2xl py-3 text-center">
                <p className="text-2xl font-extrabold">{s.val}</p>
                <p className="text-[10px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Day calendar */}
        <div className="bg-white rounded-3xl p-4 shadow mt-5">
          <div className="flex items-center gap-2">
            <button onClick={() => scrollDates(-1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">‹</button>
            <div id="sched-day-scroll" className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {monthDays.map((d) => {
                const isActive = d.dayNum === selectedDay;
                const isToday = d.dayNum === today.getDate();
                const style = isActive ? { backgroundColor: '#0F6E6E' }
                  : isToday ? { backgroundColor: '#F1D88A' } : {};
                return (
                  <button key={d.dayNum} id={isToday ? 'sched-today-cell' : undefined}
                          onClick={() => setSelectedDay(d.dayNum)}
                          className={`flex flex-col items-center rounded-2xl px-3 py-2 min-w-[60px] shadow shrink-0 ${isActive ? 'text-white' : 'text-ink'} ${!isActive && !isToday ? 'bg-white border border-gray-100' : ''}`}
                          style={style}>
                    <span className="text-xs font-semibold">{d.dayLabel}</span>
                    <span className="text-2xl font-extrabold">{d.dayNum}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => scrollDates(1)}
                    className="w-8 h-8 rounded-full bg-cream shadow flex items-center justify-center text-ink shrink-0">›</button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow mt-4">
          <Search size={18} className="text-ink/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search name"
                 className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 justify-center">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-bold shadow ${filter === f ? 'text-white' : 'bg-white text-ink'}`}
                    style={filter === f ? { backgroundColor: '#0F6E6E' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* Selected day label */}
        <p className="text-sm font-semibold text-ink/70 mt-4 mb-2">{prettyDate}</p>

        {/* List */}
        <div className="bg-white rounded-3xl p-4 shadow mb-4">
          {loading ? (
            <div className="text-center py-10 text-ink/50">Loading your visitors…</div>
          ) : error ? (
            <div className="text-center py-10 text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="flex justify-center mb-2"><Inbox size={36} className="text-ink/40" /></div>
              <p className="text-ink/60 font-semibold">No visitors on this day</p>
              <p className="text-ink/40 text-sm mt-1">Pick another date or pre-register a visitor.</p>
            </div>
          ) : (
            <>
              {filtered.map((s, i) => {
                // Ipakita ang Edit/Delete isang beses lang bawat registration (at kung canManage)
                const showManage = s.canManage && s.status === 'EXPECTED' && !shownManage.has(s.registrationId);
                if (showManage) shownManage.add(s.registrationId);
                return (
                  <div key={i} className="border border-gray-200 rounded-2xl p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold text-ink text-center w-16 shrink-0">-----</div>
                      <div className="flex-1">
                        <p className="font-bold text-ink">{s.name}</p>
                        <p className="text-sm text-ink/60">{s.type}</p>
                        <p className="text-sm text-ink/60">Purpose: {s.purpose}</p>
                      </div>
                      {filter === 'ALL' && (
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={statusStyle[s.status] || { backgroundColor: '#eee', color: '#666' }}>
                          {s.status}
                        </span>
                      )}
                    </div>
                    {/* #1: Edit (date+purpose) + Delete — Expected lang */}
                    {showManage && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => setEditReg({ registrationId: s.registrationId, purpose: s.rawPurpose, expectedDate: s.expectedDate })}
                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold text-teal-700 border border-teal-200 bg-teal-50">
                          <Pencil size={14} /> Edit
                        </button>
                        <button onClick={() => setDelReg({ registrationId: s.registrationId, name: s.name })}
                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold text-red-700 border border-red-200 bg-red-50">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-center text-ink/50 text-sm py-2">--- Nothing follows ---</p>
            </>
          )}
        </div>
      </div>

      {/* Edit modal (date + purpose lang) */}
      {editReg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setEditReg(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditReg(null)} className="absolute top-4 right-4 text-ink/50"><X size={20} /></button>
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3"><CalendarDays size={26} className="text-teal-700" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-1 text-center">Edit Registration</h3>
            <p className="text-ink/60 text-sm mb-5 text-center">You can change the date and purpose only.</p>

            <label className="block text-xs font-bold text-ink mb-1">Expected Date</label>
            <input type="date" value={editReg.expectedDate || ''}
                   onChange={(e) => setEditReg({ ...editReg, expectedDate: e.target.value })}
                   className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600 mb-3" />

            <label className="block text-xs font-bold text-ink mb-1">Purpose</label>
            <input value={editReg.purpose || ''}
                   onChange={(e) => setEditReg({ ...editReg, purpose: e.target.value })}
                   placeholder="e.g. Family visit"
                   className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600 mb-5" />

            <div className="flex gap-3">
              <button onClick={() => setEditReg(null)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
              <button disabled={busy} onClick={saveEdit}
                      className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-60" style={{ backgroundColor: '#0F6E6E' }}>
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {delReg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setDelReg(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3"><Trash2 size={26} className="text-red-600" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-1">Delete registration?</h3>
            <p className="text-ink/60 text-sm mb-5">This will remove your pre-registration{delReg.name ? ` for ${delReg.name}` : ''}. This can’t be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelReg(null)} className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-ink text-sm">Cancel</button>
              <button disabled={busy} onClick={confirmDelete}
                      className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-60" style={{ backgroundColor: '#C0392B' }}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

      <BottomNav active="schedule" />
    </div>
  );
}
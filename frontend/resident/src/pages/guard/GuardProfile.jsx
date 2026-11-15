import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import PageHeader from '../../components/PageHeader';
import { getMyShift, getMyGuardProfile, endGuardShift } from '../../api';
import { Shield, Building2, CalendarDays, DoorOpen, LogOut, Phone, CircleDot } from 'lucide-react';

const dutyColor = (label) =>
  label === 'ON DUTY' ? '#1e8e3e' : label === 'ON BREAK' ? '#b8901f' : '#8a2b2b';

// TIME 'HH:MM:SS' → "6:00 AM"
const fmt12 = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = (h % 12) || 12;
  return `${hh}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

export default function GuardProfile() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('sentricore_user') || '{}');

  // ── Assigned shift + FULL profile (mula DB) ──
  const [shift, setShift] = useState({ shiftStart: null, shiftEnd: null, timeIn: null, shiftId: null });
  const [profile, setProfile] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const loadShift = () => getMyShift().then((res) => setShift(res.data || {})).catch(() => {});
  useEffect(() => {
    loadShift();
    getMyGuardProfile().then((res) => setProfile(res.data || null)).catch(() => setProfile(null));
  }, []);
  // Real-time: i-update ang oras kada segundo (para sa duty + countdown) at
  // i-refetch ang shift kada 20s para agad sumunod kapag binago ni admin.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    const s = setInterval(loadShift, 20000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  const shiftLabel = (shift.shiftStart && shift.shiftEnd)
    ? `${fmt12(shift.shiftStart)} - ${fmt12(shift.shiftEnd)}`
    : 'No shift set';

  const p = profile || {};

  // ── Duty = base LANG sa oras ngayon vs shift window (On Duty kung sakop; kaya ang cross-midnight) ──
  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const now = new Date(nowTick);
  const curMin = now.getHours() * 60 + now.getMinutes();
  const hasShift = !!(shift.shiftStart && shift.shiftEnd);
  const sMin = toMin(shift.shiftStart), eMin = toMin(shift.shiftEnd);
  const onDuty = hasShift && (sMin === eMin ? false : (sMin < eMin ? (curMin >= sMin && curMin < eMin) : (curMin >= sMin || curMin < eMin)));
  const duty = onDuty ? 'ON DUTY' : 'OFF DUTY';

  // End datetime ng kasalukuyang duty (para sa countdown + para malaman kung "tapos na")
  const shiftEndDate = (() => {
    if (!onDuty) return null;
    const [eh, em] = String(shift.shiftEnd).split(':').map(Number);
    const end = new Date(now); end.setHours(eh || 0, em || 0, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1); // cross-midnight (gabi papuntang umaga)
    return end;
  })();
  const remainingLabel = (() => {
    if (!shiftEndDate) return '—';
    const diff = shiftEndDate.getTime() - nowTick;
    if (diff <= 0) return 'Shift is over';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  })();
  // End Shift ay puwede kapag OFF DUTY na (tapos na ang oras ng shift)
  const isShiftOver = hasShift && !onDuty;

  const guard = {
    name: p.full_name || user.name || 'Guard',
    role: 'Security Guard',
    employeeId: p.employee_id || (user.guardId ? `GD-${String(user.guardId).padStart(4, '0')}` : (user.username || '—')),
    username: p.username || user.username || '—',
    phone: p.phone_number || '—',
    duty,
    photo: p.photo || null,
  };

  const assignment = {
    gate: p.gate_name || (p.gate_id != null ? `Gate ${p.gate_id}` : (user.gateId ? `Gate ${user.gateId}` : 'Assigned Gate')),
    gateSub: p.gate_id != null ? `Gate ${p.gate_id}` : (user.gateId ? `Gate ${user.gateId}` : '—'),
    shiftStatus: duty,
  };

  const goSignin = () => {
    sessionStorage.removeItem('sentricore_token');
    sessionStorage.removeItem('sentricore_user');
    navigate('/signin');
  };

  // END SHIFT — records time-out (only when the shift hours are over)
  const endShift = async () => {
    if (!isShiftOver) {
      alert('Your shift is not over yet. You can end your shift once your scheduled time is done.');
      return;
    }
    if (!window.confirm('End your shift now? This will record your time-out and sign you out.')) return;
    setEnding(true);
    try { await endGuardShift(); } catch { /* ituloy pa rin */ }
    goSignin();
  };

  // LOG OUT — signs out only; NOT a time-out (guard stays On Duty)

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Gradient wave header (walang logo at pangalan) */}
      <PageHeader />

      <div className="px-5 pt-3 relative">
        {/* Profile card — teal gradient */}
        <div className="rounded-3xl p-6 shadow-lg text-white mt-2"
             style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center border-2 border-white/40 overflow-hidden">
                {guard.photo
                  ? <img src={guard.photo} alt={guard.name} className="w-full h-full object-cover" />
                  : <Shield size={38} className="text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold break-words">{guard.name.toUpperCase()}</h2>
              <p className="text-white/80 text-sm mb-2">{guard.role}</p>
              <p className="text-sm"><span className="font-bold">Employee ID:</span> {guard.employeeId}</p>
              <p className="text-sm"><span className="font-bold">Username:</span> {guard.username}</p>
              <p className="text-sm flex items-center gap-1"><Phone size={12} className="shrink-0" /><span className="break-all">{guard.phone}</span></p>
            </div>
          </div>
        </div>

        {/* Assignment card — 3 na centered na column (Gate / Shift / Status) */}
        <div className="bg-white rounded-3xl p-5 shadow-lg mt-4 grid grid-cols-3 text-center">
          <div className="px-1">
            <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-2"><Building2 size={20} className="text-ink" /></div>
            <p className="text-[11px] font-bold text-ink/60">Assigned Gate</p>
            <p className="font-bold text-ink text-sm leading-tight mt-0.5">{assignment.gate}</p>
            <p className="text-[11px] text-ink/60">{assignment.gateSub}</p>
          </div>
          <div className="px-1" style={{ borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
            <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-2"><CalendarDays size={20} className="text-ink" /></div>
            <p className="text-[11px] font-bold text-ink/60">Assigned Shift</p>
            <p className="font-bold text-ink text-sm leading-tight mt-0.5 break-words">{shiftLabel}</p>
          </div>
          <div className="px-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2"
                 style={{ backgroundColor: onDuty ? '#D6EAD9' : '#FBE0E0' }}>
              <CircleDot size={20} style={{ color: onDuty ? '#1e8e3e' : '#8a2b2b' }} />
            </div>
            <p className="text-[11px] font-bold text-ink/60">Status</p>
            <p className="font-extrabold text-sm mt-0.5" style={{ color: onDuty ? '#1e8e3e' : '#8a2b2b' }}>{duty}</p>
            <p className="text-[11px] text-ink/60 mt-0.5">{onDuty ? `Ends in ${remainingLabel}` : (hasShift ? 'Not on duty now' : '—')}</p>
          </div>
        </div>

        {/* End shift banner — elevated */}
        <div className="rounded-2xl p-4 mt-4 flex items-center gap-3 shadow-lg" style={{ backgroundColor: '#FBE0E0' }}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0"><DoorOpen size={20} className="text-ink" /></div>
          <div className="flex-1">
            <p className="font-bold text-ink text-sm">End your shift when your scheduled time is done.</p>
            <p className="text-xs text-ink/60">
              {isShiftOver
                ? 'Your shift time is over. Tap End Shift to record your time-out.'
                : 'This will be available once your shift ends. It records your time-out.'}
            </p>
          </div>
          <button onClick={endShift} disabled={!isShiftOver || ending}
                  className="text-white font-bold text-xs px-4 py-2 rounded-full shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}>
            {ending ? 'ENDING…' : 'END SHIFT'}
          </button>
        </div>

        {/* Log out — sign out lang, HINDI time-out (nananatiling On Duty) */}
        <button onClick={() => setShowLogout(true)}
                className="w-full mt-4 mb-4 rounded-2xl p-4 flex items-center gap-3 bg-white shadow-lg active:scale-[0.99] transition">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><LogOut size={20} className="text-ink" /></div>
          <div className="flex-1 text-left">
            <p className="font-bold text-ink text-sm">Log Out</p>
            <p className="text-xs text-ink/60">Sign out of the dashboard. This does not end your shift — you stay On Duty.</p>
          </div>
        </button>
      </div>

      {/* Log out confirmation */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3"><LogOut size={26} className="text-red-600" /></div>
            <h3 className="text-xl font-extrabold text-ink mb-1">Log out?</h3>
            <p className="text-ink/60 text-sm mb-5">Sign out of the dashboard? This does not end your shift — you stay On Duty.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-ink border border-gray-300">Cancel</button>
              <button onClick={goSignin}
                      className="flex-1 py-3 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#C0392B' }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <GuardBottomNav active="profile" />
    </div>
  );
}
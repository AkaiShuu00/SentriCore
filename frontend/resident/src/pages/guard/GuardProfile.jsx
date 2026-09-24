import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuardBottomNav from '../../components/GuardBottomNav';
import { getMyShift, getMyGuardProfile } from '../../api';
import { Shield, Building2, CalendarDays, DoorOpen, CalendarRange, Phone, Mail } from 'lucide-react';

// DB status → duty label (ON DUTY / ON BREAK / OFF DUTY)
const dutyLabel = (s) => {
  const v = String(s || '').toLowerCase();
  if (v.includes('break')) return 'ON BREAK';
  if (v.includes('on') || v === 'active') return 'ON DUTY';
  return 'OFF DUTY';
};
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
  const user = JSON.parse(localStorage.getItem('sentricore_user') || '{}');

  // ── Assigned shift + FULL profile (mula DB) ──
  const [shift, setShift] = useState({ shiftStart: null, shiftEnd: null });
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getMyShift().then((res) => setShift(res.data || {})).catch(() => {});
    getMyGuardProfile().then((res) => setProfile(res.data || null)).catch(() => setProfile(null));
  }, []);
  const shiftLabel = (shift.shiftStart && shift.shiftEnd)
    ? `${fmt12(shift.shiftStart)} - ${fmt12(shift.shiftEnd)}`
    : 'No shift set';

  const p = profile || {};
  const duty = dutyLabel(p.status);

  // ── Guard details (mula DB; fallback sa token habang naglo-load) ──
  const guard = {
    name: p.full_name || user.name || 'Guard',
    role: 'Security Guard',
    employeeId: p.employee_id || (user.guardId ? `GD-${String(user.guardId).padStart(4, '0')}` : (user.username || '—')),
    username: p.username || user.username || '—',
    phone: p.phone_number || '—',
    email: p.email || '—',
    status: p.status || 'Active',
    duty,
    photo: p.photo || null,
  };

  const assignment = {
    gate: p.gate_name || (p.gate_id != null ? `Gate ${p.gate_id}` : (user.gateId ? `Gate ${user.gateId}` : 'Assigned Gate')),
    gateSub: p.gate_id != null ? `Gate ${p.gate_id}` : (user.gateId ? `Gate ${user.gateId}` : '—'),
    shiftStatus: duty,
  };

  const endShift = () => {
    if (!window.confirm('End your shift and log out?')) return;
    localStorage.removeItem('sentricore_token');
    localStorage.removeItem('sentricore_user');
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-cream pb-28 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center justify-between">
        <img src="/logo.png" alt="SentriCore" className="w-12 h-12 object-contain" />
        <div className="inline-flex items-center gap-3 bg-cream rounded-full pl-5 pr-1 py-1 shadow">
          <span className="font-bold text-ink">{user.name || 'Guard'}</span>
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center"><Shield size={20} className="text-ink" /></div>
        </div>
      </header>

      <div className="px-5">
        {/* Title */}
        <h1 className="text-2xl font-extrabold text-ink mt-6">GUARD PROFILE</h1>
        <p className="text-ink/60 mt-1 mb-4">View your profile, shift details, and assignments</p>

        {/* Profile card */}
        <div className="rounded-3xl p-5 shadow-lg text-white"
             style={{ background: 'linear-gradient(135deg, #0F5E5E 0%, #7FB0AE 100%)' }}>
          <div className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-20 rounded-full bg-yellow-200 flex items-center justify-center border-2 border-white/40 overflow-hidden">
                {guard.photo
                  ? <img src={guard.photo} alt={guard.name} className="w-full h-full object-cover" />
                  : <Shield size={38} className="text-ink" />}
              </div>
              <span className="mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-teal-300 text-ink">{guard.duty}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold break-words">{guard.name.toUpperCase()}</h2>
              <p className="text-white/80 text-sm mb-2">{guard.role}</p>
              <p className="text-sm"><span className="font-bold">Employee ID:</span> {guard.employeeId}</p>
              <p className="text-sm"><span className="font-bold">Username:</span> {guard.username}</p>
              <p className="text-sm flex items-center gap-1"><Phone size={12} className="shrink-0" /><span className="break-all">{guard.phone}</span></p>
              <p className="text-sm flex items-center gap-1"><Mail size={12} className="shrink-0" /><span className="break-all">{guard.email}</span></p>
            </div>
          </div>
        </div>

        {/* Assignment card */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4 flex">
          <div className="flex-1 pr-2">
            <p className="text-xs font-bold text-ink mb-2">Assigned Gate</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center"><Building2 size={20} className="text-ink" /></div>
              <div>
                <p className="font-bold text-ink text-sm">{assignment.gate}</p>
                <p className="text-xs text-ink/60">{assignment.gateSub}</p>
              </div>
            </div>
          </div>
          <div className="border-l border-gray-200" />
          <div className="flex-1 px-2">
            <p className="text-xs font-bold text-ink mb-2">Current Shift</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center"><CalendarDays size={20} className="text-ink" /></div>
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm break-words">{shiftLabel}</p>
                <p className="text-xs text-ink/60">Assigned shift</p>
              </div>
            </div>
          </div>
          <div className="border-l border-gray-200" />
          <div className="flex-1 pl-2">
            <p className="text-xs font-bold text-ink mb-2">Shift Status</p>
            <p className="font-extrabold text-sm" style={{ color: dutyColor(assignment.shiftStatus) }}>{assignment.shiftStatus}</p>
            <p className="text-xs text-ink/60 mt-1">—</p>
          </div>
        </div>

        {/* End shift banner */}
        <div className="rounded-2xl p-4 mt-4 flex items-center gap-3" style={{ backgroundColor: '#FBE0E0' }}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0"><DoorOpen size={20} className="text-ink" /></div>
          <div className="flex-1">
            <p className="font-bold text-ink text-sm">End your shift when your turnover is complete.</p>
            <p className="text-xs text-ink/60">This will log your time-out and update your status</p>
          </div>
          <button onClick={endShift}
                  className="text-white font-bold text-xs px-4 py-2 rounded-full shrink-0" style={{ backgroundColor: '#C0392B' }}>
            END SHIFT
          </button>
        </div>

        {/* Today's shift schedule — base sa naka-assign na shift ni admin */}
        <div className="bg-white rounded-3xl p-5 shadow mt-4 mb-4">
          <h3 className="text-xl font-extrabold text-ink mb-4">TODAY'S SCHEDULE</h3>
          {(shift.shiftStart && shift.shiftEnd) ? (
            <div className="border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                <CalendarRange size={22} className="text-ink" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{shiftLabel}</p>
                <p className="text-sm text-ink/60">{assignment.gate}</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#B4E4BE', color: dutyColor(assignment.shiftStatus) }}>
                {assignment.shiftStatus}
              </span>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-2"><CalendarRange size={36} className="text-ink/40" /></div>
              <p className="text-ink/60 font-semibold">No shift assigned yet</p>
              <p className="text-ink/40 text-sm mt-1">Your admin-assigned shift will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <GuardBottomNav active="profile" />
    </div>
  );
}
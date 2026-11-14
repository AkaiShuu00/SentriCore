import { useState } from 'react';
import { ChevronDown, Pencil, Trash2, Inbox, User, Users, Truck } from 'lucide-react';

const DARK = '#0A4A4A';
const ST = {
  Active:   { bg: '#D6EAD9', fg: '#1e6b2e' },
  Expected: { bg: '#DCECE9', fg: '#0F6E6E' },
  Departed: { bg: '#E5E7EB', fg: '#6b7280' },
};

// Grouped na listahan ng registrations (batch = isang grupo).
//   which: 'ALL' | 'ACTIVE' | 'EXPECTED' — kung aling subset ng bisita ang ipapakita
//   onEdit/onDelete (opsyonal): ipapakita ang Edit/Delete per-registration kung canManage
export default function GroupList({ registrations = [], which = 'EXPECTED', search = '', onEdit, onDelete, emptyText = 'No visitors here.' }) {
  const [openId, setOpenId] = useState(null);
  const q = search.toLowerCase();

  const inSubset = (v) => which === 'ALL' ? v.status !== 'Departed'
    : which === 'ACTIVE' ? v.status === 'Active'
    : v.status === 'Expected';

  const groups = registrations
    .map((r) => ({ r, subset: (r.visitors || []).filter(inSubset) }))
    .filter((g) => g.subset.length > 0)
    .filter((g) => {
      if (!q) return true;
      const inNames = g.subset.some((v) => (v.name || '').toLowerCase().includes(q));
      const inBatch = String(g.r.batch_name || '').toLowerCase().includes(q);
      const inOrder = String(g.r.order_id || '').toLowerCase().includes(q);
      return inNames || inBatch || inOrder;
    });

  if (groups.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-2"><Inbox size={34} className="text-ink/40" /></div>
        <p className="text-ink/60 font-semibold text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ r, subset }) => {
        const type = r.registration_type;
        const isBatch = type === 'Batch';
        const isDelivery = type === 'Delivery';
        const expanded = openId === r.registration_id;
        const canManage = r.canManage && (which === 'EXPECTED' || which === 'ALL');
        const Icon = isBatch ? Users : isDelivery ? Truck : User;

        const manageRow = canManage && (onEdit || onDelete) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            {onEdit && (
              <button onClick={() => onEdit(r)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold text-teal-700 border border-teal-200 bg-teal-50">
                <Pencil size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(r)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold text-red-700 border border-red-200 bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        );

        // ── BATCH: summary + expandable names ──
        if (isBatch) {
          return (
            <div key={r.registration_id} className="border border-gray-200 rounded-2xl p-4">
              <button onClick={() => setOpenId(expanded ? null : r.registration_id)} className="w-full flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
                  <Icon size={20} style={{ color: '#0F6E6E' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold" style={{ color: DARK }}>Batch #{r.batch_name || '—'}</p>
                  <p className="text-xs text-ink/60 truncate">Purpose: {r.purpose || '—'}</p>
                  <p className="text-xs text-ink/60">{subset.length} of {(r.visitors || []).length} visitor{(r.visitors || []).length === 1 ? '' : 's'}</p>
                </div>
                <ChevronDown size={18} className={`text-ink/40 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[11px] font-semibold text-ink/50">List of Visitors</p>
                  {subset.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-sm" style={{ color: DARK }}>{String(i + 1).padStart(2, '0')} · {v.name}</span>
                      {which === 'ALL' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: (ST[v.status] || ST.Expected).bg, color: (ST[v.status] || ST.Expected).fg }}>{v.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {manageRow}
            </div>
          );
        }

        // ── DELIVERY ──
        if (isDelivery) {
          const v = subset[0] || {};
          return (
            <div key={r.registration_id} className="border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
                  <Icon size={20} style={{ color: '#0F6E6E' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold" style={{ color: DARK }}>Order ID: {r.order_id || '—'}</p>
                  <p className="text-xs text-ink/60">Type of Visitor: Delivery</p>
                  <p className="text-xs text-ink/60">Purpose of Visit: {r.purpose || '—'}</p>
                </div>
                {which === 'ALL' && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: (ST[v.status] || ST.Expected).bg, color: (ST[v.status] || ST.Expected).fg }}>{v.status || 'Expected'}</span>
                )}
              </div>
              {manageRow}
            </div>
          );
        }

        // ── SINGLE ──
        const v = subset[0] || {};
        return (
          <div key={r.registration_id} className="border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(15,110,110,0.12)' }}>
                <Icon size={20} style={{ color: '#0F6E6E' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: DARK }}>{v.name || '—'}</p>
                <p className="text-xs text-ink/60">Type of Visitor: Visitor</p>
                <p className="text-xs text-ink/60">Purpose: {r.purpose || '—'}</p>
              </div>
              {which === 'ALL' && (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: (ST[v.status] || ST.Expected).bg, color: (ST[v.status] || ST.Expected).fg }}>{v.status || 'Expected'}</span>
              )}
            </div>
            {manageRow}
          </div>
        );
      })}
    </div>
  );
}
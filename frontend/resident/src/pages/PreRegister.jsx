import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  ink:   '#112D31',
  cream: '#F9F6ED',
  teal:  '#0F6E6E',
};

// Format helper (mm/dd/yyyy)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—';

// ─── Step 1: Choose Registration Type ───────────────────────────────────────
function StepChooseType({ onSelect, onClose }) {
  const types = [
    { key: 'Single',   label: 'Single Visitor',  icon: SingleIcon },
    { key: 'Batch',    label: 'Batch Visitors',   icon: BatchIcon  },
    { key: 'Delivery', label: 'Delivery',          icon: DeliveryIcon },
  ];

  return (
    <div style={styles.modalCard}>
      <button style={styles.backBtn} onClick={onClose}>‹</button>
      <h2 style={styles.modalTitle}>Choose Registration Type</h2>

      <div style={styles.typeGrid}>
        {types.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            style={{
              ...styles.typeTile,
              gridColumn: key === 'Delivery' ? '1 / -1' : undefined,
              width: key === 'Delivery' ? 140 : '100%',
              margin: key === 'Delivery' ? '0 auto' : undefined,
            }}
            onClick={() => onSelect(key)}
          >
            <Icon />
            <span style={styles.typeTileLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 (Single): Details ───────────────────────────────────────────────
function StepDetails({ form, onChange, onBack, onConfirm }) {
  return (
    <div style={styles.modalCard}>
      <button style={styles.backBtn} onClick={onBack}>‹</button>
      <h2 style={styles.modalTitle}>Visitor Details</h2>
      <p style={styles.modalSubtitle}>Please fill out the form below</p>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Name of Visitor</label>
        <input
          style={styles.input}
          placeholder="Dela Samaco"
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Purpose of Visit</label>
        <input
          style={styles.input}
          placeholder="Family gathering"
          value={form.purpose}
          onChange={e => onChange('purpose', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Expected Date</label>
        <input
          style={styles.input}
          type="date"
          value={form.date}
          onChange={e => onChange('date', e.target.value)}
        />
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnBack} onClick={onBack}>BACK</button>
        <button style={styles.btnConfirm} onClick={onConfirm}>CONFIRM</button>
      </div>
    </div>
  );
}

// ─── Step 2 (Delivery): Details ─────────────────────────────────────────────
function StepDeliveryDetails({ form, onChange, onBack, onConfirm }) {
  return (
    <div style={styles.modalCard}>
      <button style={styles.backBtn} onClick={onBack}>‹</button>
      <h2 style={styles.modalTitle}>Delivery Details</h2>
      <p style={styles.modalSubtitle}>Please fill out the form below</p>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>
          Order ID <span style={styles.reqNote}>(required)</span>
        </label>
        <input
          style={styles.input}
          placeholder="PH 268358905823K"
          value={form.orderId}
          onChange={e => onChange('orderId', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>
          Name of Delivery Rider <span style={styles.optNote}>(optional)</span>
        </label>
        <input
          style={styles.input}
          placeholder="-"
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Purpose of Visit</label>
        <input
          style={styles.input}
          placeholder="Delivery"
          value={form.purpose}
          onChange={e => onChange('purpose', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Expected Date</label>
        <input
          style={styles.input}
          type="date"
          value={form.date}
          onChange={e => onChange('date', e.target.value)}
        />
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnBack} onClick={onBack}>BACK</button>
        <button style={styles.btnConfirm} onClick={onConfirm}>CONFIRM</button>
      </div>
    </div>
  );
}

// ─── Step 2 (Batch): Multiple Visitor Names ─────────────────────────────────
function StepBatchDetails({ form, onChange, onUpdateName, onAddName, onRemoveName, onBack, onConfirm }) {
  return (
    <div style={styles.modalCard}>
      <button style={styles.backBtn} onClick={onBack}>‹</button>
      <h2 style={styles.modalTitle}>Batch Visitor Details</h2>
      <p style={styles.modalSubtitle}>Please fill out the form below</p>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Purpose of Visit</label>
        <input
          style={styles.input}
          placeholder="Birthday celebration"
          value={form.purpose}
          onChange={e => onChange('purpose', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Expected Date</label>
        <input
          style={styles.input}
          type="date"
          value={form.date}
          onChange={e => onChange('date', e.target.value)}
        />
      </div>

      <div style={styles.fieldGroup}>
        <div style={styles.labelRow}>
          <label style={{ ...styles.fieldLabel, marginBottom: 0 }}>Name of Visitors</label>
          <span style={styles.totalBadge}>{form.names.length} TOTAL</span>
        </div>

        <div style={styles.nameList}>
          {form.names.map((nm, idx) => (
            <div key={idx} style={styles.nameRow}>
              <span style={styles.nameNum}>{String(idx + 1).padStart(2, '0')}</span>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Visitor name"
                value={nm}
                onChange={e => onUpdateName(idx, e.target.value)}
              />
              <button
                style={styles.removeBtn}
                onClick={() => onRemoveName(idx)}
                disabled={form.names.length === 1}
                title="Remove"
              >×</button>
            </div>
          ))}
          <button style={styles.addBtn} onClick={onAddName}>Add another + visitor</button>
        </div>
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnBack} onClick={onBack}>BACK</button>
        <button style={styles.btnConfirm} onClick={onConfirm}>CONFIRM</button>
      </div>
    </div>
  );
}

// ─── Step 3 (Single): Confirmation Summary ──────────────────────────────────
function StepConfirm({ form, onCancel, onConfirmEntry }) {
  const rows = [
    { label: 'Registration Type', value: 'Single' },
    { label: 'Visitor Name', value: form.name },
    { label: 'Purpose', value: form.purpose || '—' },
    { label: 'Expected Date', value: fmtDate(form.date) },
  ];

  return (
    <div style={styles.modalCard}>
      <h2 style={{ ...styles.modalTitle, marginBottom: 20 }}>Visitor Registration</h2>

      <div style={styles.summaryBox}>
        {rows.map(({ label, value }) => (
          <div key={label} style={styles.summaryRow}>
            <span style={styles.summaryText}>{label}: {value}</span>
          </div>
        ))}
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnCancel} onClick={onCancel}>CANCEL</button>
        <button style={styles.btnInk}   onClick={onConfirmEntry}>CONFIRM ENTRY</button>
      </div>
    </div>
  );
}

// ─── Step 3 (Delivery): Confirmation Summary ────────────────────────────────
function StepDeliveryConfirm({ form, onCancel, onConfirmEntry }) {
  const rows = [
    { label: 'Registration Type', value: 'Delivery' },
    { label: 'Order ID', value: form.orderId },
    { label: 'Purpose', value: form.purpose || '—' },
    { label: 'Expected Date', value: fmtDate(form.date) },
  ];

  return (
    <div style={styles.modalCard}>
      <h2 style={{ ...styles.modalTitle, marginBottom: 20 }}>Delivery Registration</h2>

      <div style={styles.summaryBox}>
        {rows.map(({ label, value }) => (
          <div key={label} style={styles.summaryRow}>
            <span style={styles.summaryText}>{label}: {value}</span>
          </div>
        ))}
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnCancel} onClick={onCancel}>CANCEL</button>
        <button style={styles.btnInk}   onClick={onConfirmEntry}>CONFIRM ENTRY</button>
      </div>
    </div>
  );
}

// ─── Step 3 (Batch): Confirmation Summary ───────────────────────────────────
function StepBatchConfirm({ form, onCancel, onConfirmEntry }) {
  const validNames = form.names.map(n => n.trim()).filter(Boolean);

  return (
    <div style={styles.modalCard}>
      <h2 style={{ ...styles.modalTitle, marginBottom: 20 }}>Batch Registration</h2>

      <div style={styles.summaryBox}>
        <div style={styles.summaryRow}>
          <span style={styles.summaryText}>Registration Type: Batch</span>
        </div>

        <div style={styles.summaryRow}>
          <div style={styles.labelRow}>
            <span style={styles.summaryText}>Visitor Names:</span>
            <span style={styles.totalBadge}>{validNames.length} TOTAL</span>
          </div>
        </div>

        <div style={{ maxHeight: 130, overflowY: 'auto' }}>
          {validNames.map((nm, idx) => (
            <div key={idx} style={styles.summaryRow}>
              <span style={styles.summaryText}>
                {String(idx + 1).padStart(2, '0')} &nbsp; {nm}
              </span>
            </div>
          ))}
        </div>

        <div style={styles.summaryRow}>
          <span style={styles.summaryText}>Purpose: {form.purpose || '—'}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryText}>Expected Date: {fmtDate(form.date)}</span>
        </div>
      </div>

      <div style={styles.twoBtn}>
        <button style={styles.btnCancel} onClick={onCancel}>CANCEL</button>
        <button style={styles.btnInk}   onClick={onConfirmEntry}>CONFIRM ENTRY</button>
      </div>
    </div>
  );
}

// ─── Success Modal ───────────────────────────────────────────────────────────
function StepSuccess({ count, onDone }) {
  return (
    <div style={{ ...styles.modalCard, textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
      <h2 style={{ ...styles.modalTitle, marginBottom: 8 }}>Pre-Registered!</h2>
      <p style={{ fontSize: 13, color: '#777', lineHeight: 1.6, marginBottom: 24 }}>
        {count > 1
          ? `${count} visitors have been pre-registered successfully. The guard will be notified on the expected date.`
          : 'Your visitor has been pre-registered successfully. The guard will be notified on the expected date.'}
      </p>
      <button style={styles.btnInkFull} onClick={onDone}>BACK TO HOME</button>
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────
export default function PreRegister() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(1); // 1=type, 2=details, 3=confirm, 4=success
  const [regType, setRegType] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [form, setForm] = useState({ name: '', purpose: '', date: '', names: [''], orderId: '' });

  const handleClose = () => navigate('/home');

  const handleSelectType = (type) => {
    setRegType(type);
    setStep(2);
  };

  const handleChange = (field, val) => setForm(p => ({ ...p, [field]: val }));

  // Batch name handlers
  const updateName = (idx, val) => setForm(p => {
    const names = [...p.names];
    names[idx] = val;
    return { ...p, names };
  });
  const addName = () => setForm(p => ({ ...p, names: [...p.names, ''] }));
  const removeName = (idx) => setForm(p => {
    if (p.names.length === 1) return p; // keep at least one
    return { ...p, names: p.names.filter((_, i) => i !== idx) };
  });

  const handleDetailsConfirm = () => {
    if (regType === 'Batch') {
      const validNames = form.names.map(n => n.trim()).filter(Boolean);
      if (validNames.length === 0) { alert('Please enter at least one visitor name.'); return; }
      if (!form.date) { alert('Please select an expected date.'); return; }
      setStep(3);
      return;
    }
    if (regType === 'Delivery') {
      if (!form.orderId.trim()) { alert('Please enter the Order ID.'); return; }
      if (!form.date)           { alert('Please select an expected date.'); return; }
      setStep(3);
      return;
    }
    if (!form.name.trim()) { alert('Please enter a name.'); return; }
    if (!form.date)        { alert('Please select an expected date.'); return; }
    setStep(3);
  };

  // Save to localStorage — batch saves EACH name as a separate expected entry
  const handleConfirmEntry = () => {
    const existing = JSON.parse(localStorage.getItem('sentricore_expected') || '[]');
    let newEntries = [];

    if (regType === 'Batch') {
      const validNames = form.names.map(n => n.trim()).filter(Boolean);
      newEntries = validNames.map((nm, i) => ({
        id: Date.now() + i,
        regType: 'Batch',
        name: nm,
        purpose: form.purpose,
        date: form.date,
      }));
    } else if (regType === 'Delivery') {
      newEntries = [{
        id: Date.now(),
        regType: 'Delivery',
        // display name: rider name kung meron, kung wala gamitin ang Order ID
        name: form.name.trim() || form.orderId.trim(),
        orderId: form.orderId,
        purpose: form.purpose || 'Delivery',
        date: form.date,
      }];
    } else {
      newEntries = [{
        id: Date.now(),
        regType,
        name: form.name,
        purpose: form.purpose,
        date: form.date,
      }];
    }

    localStorage.setItem('sentricore_expected', JSON.stringify([...newEntries, ...existing]));
    setSavedCount(newEntries.length);
    setStep(4);
  };

  const handleCancel = () => {
    setForm({ name: '', purpose: '', date: '', names: [''], orderId: '' });
    setStep(1);
  };

  const isBatch = regType === 'Batch';
  const isDelivery = regType === 'Delivery';

  return (
    /* dark scrim — clicking outside closes */
    <div style={styles.overlay} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()}>
        {step === 1 && (
          <StepChooseType onSelect={handleSelectType} onClose={handleClose} />
        )}

        {step === 2 && isBatch && (
          <StepBatchDetails
            form={form}
            onChange={handleChange}
            onUpdateName={updateName}
            onAddName={addName}
            onRemoveName={removeName}
            onBack={() => setStep(1)}
            onConfirm={handleDetailsConfirm}
          />
        )}
        {step === 2 && isDelivery && (
          <StepDeliveryDetails
            form={form}
            onChange={handleChange}
            onBack={() => setStep(1)}
            onConfirm={handleDetailsConfirm}
          />
        )}
        {step === 2 && !isBatch && !isDelivery && (
          <StepDetails
            form={form}
            onChange={handleChange}
            onBack={() => setStep(1)}
            onConfirm={handleDetailsConfirm}
          />
        )}

        {step === 3 && isBatch && (
          <StepBatchConfirm
            form={form}
            onCancel={handleCancel}
            onConfirmEntry={handleConfirmEntry}
          />
        )}
        {step === 3 && isDelivery && (
          <StepDeliveryConfirm
            form={form}
            onCancel={handleCancel}
            onConfirmEntry={handleConfirmEntry}
          />
        )}
        {step === 3 && !isBatch && !isDelivery && (
          <StepConfirm
            form={form}
            onCancel={handleCancel}
            onConfirmEntry={handleConfirmEntry}
          />
        )}

        {step === 4 && <StepSuccess count={savedCount} onDone={handleClose} />}
      </div>
    </div>
  );
}

// ─── SVG Icons (outline, matching Figma) ────────────────────────────────────
function SingleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="15" r="7" stroke={COLORS.teal} strokeWidth="2" />
      <path d="M6 38c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BatchIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="6" stroke={COLORS.teal} strokeWidth="2" />
      <circle cx="29" cy="15" r="6" stroke={COLORS.teal} strokeWidth="2" />
      <path d="M2 38c0-7.18 5.82-13 13-13" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
      <path d="M29 25c7.18 0 13 5.82 13 13" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 25c3.866 0 7 3.134 7 7" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
      <path d="M29 25c-3.866 0-7 3.134-7 7" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="13" width="26" height="18" rx="2" stroke={COLORS.teal} strokeWidth="2" />
      <path d="M29 18h6l6 7v6h-12V18z" stroke={COLORS.teal} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="10" cy="33" r="3" stroke={COLORS.teal} strokeWidth="2" />
      <circle cx="35" cy="33" r="3" stroke={COLORS.teal} strokeWidth="2" />
    </svg>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px', fontFamily: "'Poppins', sans-serif",
  },
  modalCard: {
    background: 'white', borderRadius: 24, padding: '28px 24px 24px',
    width: '100%', maxWidth: 340, position: 'relative',
    maxHeight: '88vh', overflowY: 'auto',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16, width: 32, height: 32,
    borderRadius: '50%', border: '1.5px solid #ddd', background: 'white',
    cursor: 'pointer', fontSize: 18, fontWeight: 700, color: COLORS.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  },
  modalTitle: {
    fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18,
    color: COLORS.ink, textAlign: 'center', marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: "'Poppins', sans-serif", fontSize: 12, color: '#888',
    textAlign: 'center', marginBottom: 20,
  },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 },
  typeTile: {
    background: '#f0faf6', border: '1.5px solid #d0ede5', borderRadius: 16,
    padding: '20px 12px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10, cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif", transition: 'border-color .15s, background .15s',
  },
  typeTileLabel: { fontSize: 11, fontWeight: 700, color: COLORS.ink, textAlign: 'center' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    display: 'block', fontFamily: "'Poppins', sans-serif", fontSize: 13,
    fontWeight: 700, color: COLORS.ink, marginBottom: 6,
  },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reqNote: { fontWeight: 400, color: '#c0392b', fontSize: 12 },
  optNote: { fontWeight: 400, color: '#aaa', fontSize: 12 },
  totalBadge: {
    fontSize: 9, fontWeight: 700, color: COLORS.ink,
    background: '#e8f0ee', borderRadius: 999, padding: '3px 9px',
    fontFamily: "'Poppins', sans-serif", letterSpacing: '.5px',
  },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #ddd',
    fontFamily: "'Poppins', sans-serif", fontSize: 13, background: 'white',
    outline: 'none', boxSizing: 'border-box', color: COLORS.ink,
  },
  nameList: {
    display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 200, overflowY: 'auto', paddingRight: 2,
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8 },
  nameNum: { fontSize: 11, fontWeight: 700, color: '#aaa', width: 20, textAlign: 'center', flexShrink: 0 },
  removeBtn: {
    width: 26, height: 26, borderRadius: '50%', border: '1px solid #eee',
    background: 'white', color: '#c0392b', cursor: 'pointer', fontSize: 15,
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  },
  addBtn: {
    border: '1px dashed #ccc', borderRadius: 12, background: '#fafafa',
    padding: '9px', cursor: 'pointer', fontSize: 12, color: '#888',
    fontFamily: "'Poppins', sans-serif", marginTop: 2,
  },
  twoBtn: { display: 'flex', gap: 10, marginTop: 20 },
  btnBack: {
    flex: 1, padding: '12px', borderRadius: 999, border: '1.5px solid #ddd',
    background: 'white', cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    fontSize: 13, fontWeight: 700, color: COLORS.ink,
  },
  btnConfirm: {
    flex: 1, padding: '12px', borderRadius: 999, border: 'none',
    background: COLORS.teal, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    fontSize: 13, fontWeight: 700, color: 'white',
  },
  btnCancel: {
    flex: 1, padding: '12px', borderRadius: 999, border: '1.5px solid #ddd',
    background: 'white', cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    fontSize: 13, fontWeight: 700, color: COLORS.ink,
  },
  btnInk: {
    flex: 1, padding: '12px', borderRadius: 999, border: 'none',
    background: COLORS.ink, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    fontSize: 13, fontWeight: 700, color: 'white',
  },
  btnInkFull: {
    width: '100%', padding: '14px', borderRadius: 999, border: 'none',
    background: COLORS.ink, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    fontSize: 13, fontWeight: 700, color: 'white',
  },
  summaryBox: { border: '1.5px solid #eee', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  summaryRow: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0' },
  summaryText: { fontFamily: "'Poppins', sans-serif", fontSize: 12, color: COLORS.ink },
};
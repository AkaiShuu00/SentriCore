import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { key: 'visitor', icon: '🧑‍⚠️', label: 'VISITOR COMPLAINT' },
  { key: 'guard', icon: '👮', label: 'GUARD COMPLAINT' },
  { key: 'security', icon: '🛡️', label: 'SECURITY CONCERN' },
  { key: 'hoa', icon: '🏠', label: 'HOA CONCERN' },
];

const TYPES_BY_CATEGORY = {
  visitor: ['Rude behavior', 'Property damage', 'Loitering', 'Unauthorized entry attempt', 'Vandalism', 'Others'],
  guard: ['Slow entry process', 'Rude behavior', 'Absent from post', 'Discriminatory treatment', 'Others'],
  security: ['Suspicious activity', 'Trespassing', 'Theft', 'Vandalism', 'Others'],
  hoa: ['Noise complaint', 'Maintenance issue', 'Parking violation', 'Policy concern', 'Others'],
};

export default function Complaints() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [dateIncident, setDateIncident] = useState('');
  const [types, setTypes] = useState([]);
  const [description, setDescription] = useState('');
  const [blocklist, setBlocklist] = useState(false);

  const toggleType = (t) => setTypes(types.includes(t) ? types.filter(x => x !== t) : [...types, t]);

  // Reset selections when switching category
  const selectCategory = (key) => {
    setSelected(key);
    setTypes([]);
  };

  function handleConfirm() {
    alert('Complaint submitted!' + (blocklist ? ' Visitor flagged for admin review.' : ''));
    navigate('/home');
  }

  const categoryTitle = CATEGORIES.find(c => c.key === selected)?.label || '';

  const nameLabel = selected === 'visitor' ? 'Visitor Name'
    : selected === 'guard' ? 'Guard Name' : 'Subject';
  const namePlaceholder = selected === 'visitor' ? 'Full name of visitor'
    : selected === 'guard' ? 'Full name of guard' : 'Enter subject';

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/home')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <h1 className="text-2xl font-extrabold text-white">Back to Home</h1>
      </header>

      <div className="px-4">
        <h2 className="text-3xl font-extrabold text-ink text-center my-6">RESIDENT COMPLAINTS</h2>

        {/* Category selection */}
        <div className="bg-white rounded-3xl p-5 shadow">
          <p className="text-ink/70 mb-3">Select a complaint category to continue</p>
          <div className="border-b border-gray-200 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => {
              const isSel = selected === c.key;
              return (
                <button key={c.key} onClick={() => selectCategory(c.key)}
                        className={`rounded-2xl p-5 flex flex-col items-center gap-2 shadow-sm border-2 transition bg-white ${isSel ? 'border-ink opacity-100' : 'border-gray-200 opacity-60'}`}>
                  <span className="text-2xl">{c.icon}</span>
                  <span className={`text-xs font-bold ${isSel ? 'text-ink' : 'text-ink/50'}`}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form (shows when a category is selected) */}
        {selected && (
          <div className="bg-white rounded-3xl p-6 shadow mt-5">
            <h3 className="text-xl font-extrabold text-ink text-center mb-1">{categoryTitle}</h3>
            <div className="border-b border-gray-200 mb-5" />

            <label className="block font-bold text-ink mb-2">{nameLabel}</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
                   placeholder={namePlaceholder}
                   className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

            <label className="block font-bold text-ink mb-2">Date of Incident</label>
            <input type="date" value={dateIncident} onChange={(e) => setDateIncident(e.target.value)}
                   className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

            <label className="block font-bold text-ink mb-2">Type of Complaint</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {(TYPES_BY_CATEGORY[selected] || []).map((t) => (
                <button key={t} onClick={() => toggleType(t)}
                        className={`px-4 py-2 rounded-full text-sm border ${types.includes(t) ? 'text-white border-ink' : 'text-ink border-ink/30'}`}
                        style={types.includes(t) ? { backgroundColor: '#0F6E6E', borderColor: '#0F6E6E' } : {}}>
                  {t}
                </button>
              ))}
            </div>

            <label className="block font-bold text-ink mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                      placeholder="Provide details about what happened..."
                      className="w-full border border-ink/30 rounded-2xl px-5 py-4 mb-5 focus:outline-none focus:ring-2 focus:ring-ink/30" />

            {/* Blocklist toggle — only for visitor complaints */}
            {selected === 'visitor' && (
              <div className="rounded-2xl p-4 mb-5 flex items-center justify-between" style={{ backgroundColor: '#F3C9C9' }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#8a2b2b' }}>Do you want to blocklist this visitor?</p>
                  <p className="text-xs" style={{ color: '#a44' }}>They will be flagged for admin review on future entries</p>
                </div>
                <button onClick={() => setBlocklist(!blocklist)}
                        className={`w-14 h-8 rounded-full flex items-center transition shrink-0 ${blocklist ? 'justify-end' : 'justify-start'}`}
                        style={{ backgroundColor: blocklist ? '#8a2b2b' : '#C4A0A0', padding: '3px' }}>
                  <span className="w-6 h-6 bg-white rounded-full shadow" />
                </button>
              </div>
            )}

            <button onClick={handleConfirm}
                    className="w-full bg-ink text-white font-extrabold text-xl py-4 rounded-full tracking-wide active:scale-95 transition">
              CONFIRM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick}
            className={`w-14 h-8 rounded-full flex items-center transition ${on ? 'justify-end' : 'justify-start'}`}
            style={{ backgroundColor: on ? '#1D4ED8' : '#C4C4C4', padding: '3px' }}>
      <span className="w-6 h-6 bg-white rounded-full shadow" />
    </button>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [push, setPush] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [cats, setCats] = useState({
    emergency: true,
    gate: true,
    community: true,
    policy: true,
  });

  const toggleCat = (key) => setCats({ ...cats, [key]: !cats[key] });

  const categories = [
    { key: 'emergency', title: 'Emergency Alerts', desc: 'Fire, medical emergencies, flood, earthquake, evacuation notices, etc' },
    { key: 'gate', title: 'Gate & Access Advisory', desc: 'Gate closures, entry/exit updates, visitor policies, etc' },
    { key: 'community', title: 'Community Advisory', desc: 'HOA meetings, maintenance, road repairs, etc' },
    { key: 'policy', title: 'Policy Updates', desc: 'Visitor guidelines, vehicle registration, etc' },
  ];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Notifications Settings</h1>
          <p className="text-white/70 text-sm">Manage how you're being notified</p>
        </div>
      </header>

      <div className="px-4 space-y-4 mt-5">
        {/* Push */}
        <div className="bg-white rounded-3xl p-5 shadow flex items-center justify-between">
          <div>
            <p className="font-extrabold text-ink">Push Notifications</p>
            <p className="text-sm text-ink/60">Receive push notifications on your device</p>
          </div>
          <Toggle on={push} onClick={() => setPush(!push)} />
        </div>

        {/* Email */}
        <div className="bg-white rounded-3xl p-5 shadow flex items-center justify-between">
          <div>
            <p className="font-extrabold text-ink">Email Notifications</p>
            <p className="text-sm text-ink/60">Receive email summaries</p>
          </div>
          <Toggle on={emailNotif} onClick={() => setEmailNotif(!emailNotif)} />
        </div>

        {/* Categories */}
        <div className="bg-white rounded-3xl p-5 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Notification Categories</h2>
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.key} className="border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-ink mb-1">{c.title}</p>
                  <p className="text-sm text-ink/60">{c.desc}</p>
                </div>
                <Toggle on={cats[c.key]} onClick={() => toggleCat(c.key)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
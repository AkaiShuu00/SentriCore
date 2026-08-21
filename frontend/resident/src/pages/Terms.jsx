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

export default function Terms() {
  const navigate = useNavigate();
  const [perms, setPerms] = useState({ camera: true, location: true, mic: true });
  const toggle = (k) => setPerms({ ...perms, [k]: !perms[k] });

  const legal = ['Privacy Policy', 'Terms of Service', 'Cookie Policy'];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Terms and Permissions</h1>
          <p className="text-white/70 text-sm">View terms, permissions, access, and policies</p>
        </div>
      </header>

      <div className="px-4 mt-5 space-y-5">
        {/* Legal Documents */}
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Legal Documents</h2>
          <div className="space-y-3">
            {legal.map((l) => (
              <button key={l} className="w-full border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
                <span className="font-semibold text-ink">{l}</span>
                <span className="text-ink/40">↗</span>
              </button>
            ))}
          </div>
        </div>

        {/* App Permissions */}
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">App Permissions</h2>
          <div className="space-y-3">
            {[
              { key: 'camera', label: 'Camera Access' },
              { key: 'location', label: 'Location Access' },
              { key: 'mic', label: 'Microphone Access' },
            ].map((p) => (
              <div key={p.key} className="border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
                <span className="font-semibold text-ink">{p.label}</span>
                <Toggle on={perms[p.key]} onClick={() => toggle(p.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Account Management</h2>
          <button className="w-full border border-gray-100 rounded-2xl px-5 py-4 shadow-sm text-left">
            <p className="font-bold text-ink">Download My Data</p>
            <p className="text-sm text-ink/60">Export all your accounts data</p>
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, ChevronDown } from 'lucide-react';

const DOCS = [
  {
    key: 'privacy',
    Icon: ShieldCheck,
    title: 'Privacy Policy',
    body: [
      { h: 'What we collect', p: 'SentriCore stores your name, unit address, contact number, and email (provided by your HOA administrator), along with the visitor registrations and gate activity linked to your account.' },
      { h: 'How we use it', p: 'Your information is used only to verify visitors at the gate, notify guards of expected visitors and pick-ups, and keep entry/exit records for the community’s security.' },
      { h: 'Visitor ID photos', p: 'When a guard scans a visitor’s ID, only the name is read for matching. The ID photo itself is never stored in the system.' },
      { h: 'Who can see your data', p: 'Your details are visible to you, the guards on duty, and your HOA administrator. They are not shared with other residents or third parties.' },
      { h: 'Data security', p: 'Passwords are stored as encrypted hashes and cannot be viewed by anyone. Access to records is limited by role (resident, guard, admin).' },
    ],
  },
  {
    key: 'tos',
    Icon: FileText,
    title: 'Terms of Service',
    body: [
      { h: 'Acceptable use', p: 'SentriCore is for managing visitors within your community. You agree to provide accurate visitor details and to use the app only for lawful, community-related purposes.' },
      { h: 'Your account', p: 'Accounts are created by your HOA administrator. Keep your password confidential — you are responsible for activity done through your account. Change your password immediately if you suspect it is compromised.' },
      { h: 'Visitor registrations', p: 'You are responsible for the visitors you pre-register. Guards may deny entry based on community rules, verification results, or the blocklist.' },
      { h: 'Service availability', p: 'The system aims for continuous availability but may be unavailable during maintenance or connectivity issues. Follow your community’s manual procedures when the app is down.' },
      { h: 'Changes to these terms', p: 'These terms may be updated by the HOA. Continued use of SentriCore after changes means you accept the updated terms.' },
    ],
  },
];

function DocCard({ Icon, title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-ink" />
        </div>
        <span className="flex-1 text-left font-semibold text-ink">{title}</span>
        <ChevronDown size={18} className={`text-ink/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {body.map((s, i) => (
            <div key={i}>
              <p className="font-bold text-ink text-sm">{s.h}</p>
              <p className="text-sm text-ink/70 mt-1 leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Terms and Permissions</h1>
          <p className="text-white/70 text-sm">View our terms of service and privacy policy</p>
        </div>
      </header>

      <div className="px-4 mt-5 space-y-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Legal Documents</h2>
          <div className="space-y-3">
            {DOCS.map((d) => (
              <DocCard key={d.key} Icon={d.Icon} title={d.title} body={d.body} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
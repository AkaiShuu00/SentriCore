import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, UserCog, Wrench, ShieldCheck, ChevronDown } from 'lucide-react';

const TOPICS = [
  {
    key: 'getting-started',
    Icon: Rocket,
    title: 'Getting Started',
    items: [
      { q: 'How do I sign in?', a: 'Use the username and temporary password given by your HOA administrator. On your first login, you will be asked to change your password. Residents and guards cannot self-register — accounts are created by the admin.' },
      { q: 'How do I pre-register a visitor?', a: 'Go to Home → Pre-Register, choose the type (Single, Batch, or Delivery), fill in the visitor name/s, purpose, and expected date, then confirm. The guard on duty will see the visitor on their schedule.' },
      { q: 'How do I notify the gate for a pick-up?', a: 'On the Home screen, tap "Notify Gate", choose if it is a ride-hailing pick-up, then confirm. The guard will see you at the top of their pick-up list marked as waiting.' },
      { q: 'Where do I see my visitors?', a: 'The Home dashboard shows today’s visitors, and "Expected Visitors" shows your upcoming and past registrations with their status (Expected, Active, Departed).' },
    ],
  },
  {
    key: 'account',
    Icon: UserCog,
    title: 'Account Management',
    items: [
      { q: 'How do I change my password?', a: 'Go to Profile → Password and Security → Change Password. Enter your current password, then your new password twice.' },
      { q: 'I forgot my password.', a: 'On the Sign In screen, tap "Forgot your password?". Enter your registered email, then type the verification code sent to that email and set a new password.' },
      { q: 'How do I update my personal details?', a: 'Your unit address, contact number, and email are managed by your HOA administrator. Contact them for any changes to your account details.' },
      { q: 'How do I view my blocklist?', a: 'Go to Profile → Blocklisted to see visitors that have been blocked. Blocklisting is handled through resolved complaints and approved by the admin.' },
    ],
  },
  {
    key: 'troubleshooting',
    Icon: Wrench,
    title: 'Troubleshooting',
    items: [
      { q: 'My visitor is not showing on the guard’s list.', a: 'Make sure the expected date is correct and that you tapped Confirm on the final step. Pull to refresh, or open "Expected Visitors" to confirm the registration was saved.' },
      { q: 'The app is not loading or showing old data.', a: 'Close and reopen the app, then check your internet connection. If it persists, sign out and sign back in.' },
      { q: 'I did not receive my verification code.', a: 'Check your spam/junk folder and confirm you entered the same email registered by your admin. The code expires after 10 minutes — request a new one if needed.' },
      { q: 'The Notify Gate button is not working.', a: 'Make sure you selected whether it is a ride-hailing pick-up before tapping Notify Gate. If it still fails, check your connection and try again.' },
    ],
  },
  {
    key: 'security',
    Icon: ShieldCheck,
    title: 'Security & Privacy',
    items: [
      { q: 'Is my visitor’s ID photo stored?', a: 'No. When a guard scans an ID, only the name is read for matching — the ID photo is never saved to the system.' },
      { q: 'Who can see my information?', a: 'Your details are visible to you, the guards on duty (for verification), and your HOA administrator. They are not shared with other residents.' },
      { q: 'How are my passwords protected?', a: 'Passwords are stored securely as encrypted hashes. No one, including administrators, can see your actual password.' },
      { q: 'Can other residents see who visits me?', a: 'No. Your visitor registrations and history are private to your account and the community’s guards and admin.' },
    ],
  },
];

function TopicCard({ Icon, title, items }) {
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
          {items.map((it, i) => (
            <div key={i}>
              <p className="font-bold text-ink text-sm">{it.q}</p>
              <p className="text-sm text-ink/70 mt-1 leading-relaxed">{it.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpCenter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const q = search.toLowerCase();
  const filtered = !q
    ? TOPICS
    : TOPICS
        .map((t) => ({
          ...t,
          items: t.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
        }))
        .filter((t) => t.title.toLowerCase().includes(q) || t.items.length > 0);

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Help Center</h1>
          <p className="text-white/70 text-sm">Need assistance?</p>
        </div>
      </header>

      <div className="px-4 space-y-5 mt-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">How can we help you?</h2>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-3 shadow-sm mb-6">
            <Search size={18} className="text-ink/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search help articles"
                   className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
          </div>

          <h3 className="text-xl font-extrabold text-ink mb-3">Popular Topics</h3>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-ink/50 py-6 text-sm">No help articles found.</p>
            ) : (
              filtered.map((t) => <TopicCard key={t.key} Icon={t.Icon} title={t.title} items={t.items} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
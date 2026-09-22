import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function FAQs() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);

  const faqs = [
    { q: 'How do I reset my password?', a: 'Go to Profile → Password and Security, then follow the steps to update your password.' },
    { q: 'How do I delete my account?', a: 'Please contact your HOA administrator to request account deletion.' },
    { q: 'How do I update my profile information?', a: 'Your profile details are managed by your HOA administrator. Contact them for changes.' },
    { q: 'Is my data secure?', a: 'Yes. We follow the Data Privacy Act of 2012. ID images are never stored — only names are used for verification.' },
    { q: 'How do I report a problem?', a: 'Use the Complaints feature (Home → Complaints). Choose one of the four categories — Visitor, Guard, Security, or HOA — to send your concern or problem to the HOA.' },
  ];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">FAQs</h1>
          <p className="text-white/70 text-sm">Frequently Asked Questions</p>
        </div>
      </header>

      <div className="px-4 mt-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                  <span className="font-semibold text-ink">{f.q}</span>
                  <ChevronDown size={18} className={`text-ink/50 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && (
                  <p className="px-5 pb-4 text-sm text-ink/70 leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
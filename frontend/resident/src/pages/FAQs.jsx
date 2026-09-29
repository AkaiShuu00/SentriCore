import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useT, LangToggle } from '../i18n';

export default function FAQs() {
  const navigate = useNavigate();
  const { t } = useT();
  const [open, setOpen] = useState(null);

  const faqs = [
    {
      q: t('How do I reset my password?', 'Paano ko ire-reset ang aking password?'),
      a: t('Go to Profile → Password and Security, then follow the steps to update your password.',
           'Pumunta sa Profile → Password at Seguridad, tapos sundin ang mga hakbang para i-update ang password.'),
    },
    {
      q: t('How do I delete my account?', 'Paano ko buburahin ang aking account?'),
      a: t('Please contact your HOA administrator to request account deletion.',
           'Makipag-ugnayan sa HOA administrator para humiling ng pagbura ng account.'),
    },
    {
      q: t('How do I update my profile information?', 'Paano ko ia-update ang impormasyon sa profile ko?'),
      a: t('Your profile details are managed by your HOA administrator. Contact them for changes.',
           'Ang detalye ng profile mo ay pinamamahalaan ng HOA administrator. Makipag-ugnayan sa kanila para sa pagbabago.'),
    },
    {
      q: t('Is my data secure?', 'Ligtas ba ang aking datos?'),
      a: t('Yes. We follow the Data Privacy Act of 2012. ID images are never stored — only names are used for verification.',
           'Oo. Sinusunod namin ang Data Privacy Act of 2012. Hindi iniimbak ang litrato ng ID — pangalan lamang ang ginagamit sa pag-verify.'),
    },
    {
      q: t('How do I report a problem?', 'Paano ako magrereport ng problema?'),
      a: t('Use the Complaints feature (Home → Complaints). Choose one of the four categories — Visitor, Guard, Security, or HOA — to send your concern or problem to the HOA.',
           'Gamitin ang Complaints feature (Home → Complaints). Pumili sa apat na kategorya — Visitor, Guard, Security, o HOA — para ipadala ang iyong reklamo o problema sa HOA.'),
    },
  ];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-white">{t('FAQs', 'Mga FAQ')}</h1>
          <p className="text-white/70 text-sm">{t('Frequently Asked Questions', 'Mga Madalas Itanong')}</p>
        </div>
        <LangToggle />
      </header>

      <div className="px-4 mt-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">{t('Frequently Asked Questions', 'Mga Madalas Itanong')}</h2>
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
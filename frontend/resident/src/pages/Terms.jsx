import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, ChevronDown } from 'lucide-react';
import { useT, LangToggle } from '../i18n';

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
  const { t } = useT();

  const DOCS = [
    {
      key: 'privacy',
      Icon: ShieldCheck,
      title: t('Privacy Policy', 'Patakaran sa Privacy'),
      body: [
        { h: t('What we collect', 'Ano ang kinokolekta namin'),
          p: t('SentriCore stores your name, unit address, contact number, and email (provided by your HOA administrator), along with the visitor registrations and gate activity linked to your account.',
               'Iniimbak ng SentriCore ang iyong pangalan, unit address, numero ng kontak, at email (ibinigay ng HOA administrator), kasama ang mga rehistro ng bisita at aktibidad sa gate na nakaugnay sa account mo.') },
        { h: t('How we use it', 'Paano namin ito ginagamit'),
          p: t('Your information is used only to verify visitors at the gate, notify guards of expected visitors and pick-ups, and keep entry/exit records for the community’s security.',
               'Ginagamit lamang ang impormasyon mo para i-verify ang bisita sa gate, ipaalam sa guard ang inaasahang bisita at sundo, at itago ang tala ng pagpasok/paglabas para sa seguridad ng komunidad.') },
        { h: t('Visitor ID photos', 'Litrato ng ID ng bisita'),
          p: t('When a guard scans a visitor’s ID, only the name is read for matching. The ID photo itself is never stored in the system.',
               'Kapag ini-scan ng guard ang ID ng bisita, pangalan lamang ang binabasa para sa pagtutugma. Hindi kailanman iniimbak sa sistema ang mismong litrato ng ID.') },
        { h: t('Who can see your data', 'Sino ang nakakakita ng datos mo'),
          p: t('Your details are visible to you, the guards on duty, and your HOA administrator. They are not shared with other residents or third parties.',
               'Ang detalye mo ay nakikita mo, ng guard na naka-duty, at ng HOA administrator. Hindi ito ibinabahagi sa ibang residente o third party.') },
        { h: t('Data security', 'Seguridad ng datos'),
          p: t('Passwords are stored as encrypted hashes and cannot be viewed by anyone. Access to records is limited by role (resident, guard, admin).',
               'Ang mga password ay naka-imbak bilang encrypted hash at hindi makikita ninuman. Limitado ang access sa tala ayon sa role (residente, guard, admin).') },
      ],
    },
    {
      key: 'tos',
      Icon: FileText,
      title: t('Terms of Service', 'Mga Tuntunin ng Serbisyo'),
      body: [
        { h: t('Acceptable use', 'Tamang paggamit'),
          p: t('SentriCore is for managing visitors within your community. You agree to provide accurate visitor details and to use the app only for lawful, community-related purposes.',
               'Ang SentriCore ay para sa pamamahala ng bisita sa loob ng komunidad. Sumasang-ayon kang magbigay ng tamang detalye ng bisita at gamitin ang app para lamang sa legal at pang-komunidad na layunin.') },
        { h: t('Your account', 'Ang iyong account'),
          p: t('Accounts are created by your HOA administrator. Keep your password confidential — you are responsible for activity done through your account. Change your password immediately if you suspect it is compromised.',
               'Ang mga account ay ginagawa ng HOA administrator. Ingatan ang password — ikaw ang responsable sa mga ginagawa gamit ang account mo. Palitan agad ang password kung pinaghihinalaang nakompromiso ito.') },
        { h: t('Visitor registrations', 'Mga rehistro ng bisita'),
          p: t('You are responsible for the visitors you pre-register. Guards may deny entry based on community rules, verification results, or the blocklist.',
               'Ikaw ang responsable sa mga bisitang irerehistro mo. Maaaring tanggihan ng guard ang pagpasok batay sa patakaran ng komunidad, resulta ng pag-verify, o sa blocklist.') },
        { h: t('Service availability', 'Availability ng serbisyo'),
          p: t('The system aims for continuous availability but may be unavailable during maintenance or connectivity issues. Follow your community’s manual procedures when the app is down.',
               'Layon ng sistema ang tuloy-tuloy na serbisyo ngunit maaaring hindi available tuwing may maintenance o problema sa koneksyon. Sundin ang manual na proseso ng komunidad kapag hindi gumagana ang app.') },
        { h: t('Changes to these terms', 'Mga pagbabago sa tuntunin'),
          p: t('These terms may be updated by the HOA. Continued use of SentriCore after changes means you accept the updated terms.',
               'Maaaring baguhin ng HOA ang mga tuntuning ito. Ang patuloy na paggamit ng SentriCore matapos ang pagbabago ay nangangahulugang tinatanggap mo ang bagong tuntunin.') },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-white">{t('Terms and Permissions', 'Mga Tuntunin at Pahintulot')}</h1>
          <p className="text-white/70 text-sm">{t('View our terms of service and privacy policy', 'Tingnan ang aming tuntunin at patakaran sa privacy')}</p>
        </div>
        <LangToggle />
      </header>

      <div className="px-4 mt-5 space-y-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">{t('Legal Documents', 'Mga Legal na Dokumento')}</h2>
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
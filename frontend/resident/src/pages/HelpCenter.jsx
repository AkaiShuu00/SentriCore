import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, UserCog, Wrench, ShieldCheck, ChevronDown } from 'lucide-react';
import { useT, LangToggle } from '../i18n';

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
  const { t } = useT();
  const [search, setSearch] = useState('');

  const TOPICS = [
    {
      key: 'getting-started',
      Icon: Rocket,
      title: t('Getting Started', 'Pagsisimula'),
      items: [
        { q: t('How do I sign in?', 'Paano ako mag-si-sign in?'),
          a: t('Use the username and temporary password given by your HOA administrator. On your first login, you will be asked to change your password. Residents and guards cannot self-register — accounts are created by the admin.',
               'Gamitin ang username at pansamantalang password na ibinigay ng HOA administrator. Sa unang login, hihilingin sa iyo na palitan ang password. Hindi puwedeng magrehistro nang mag-isa ang residente at guard — ang admin ang gumagawa ng account.') },
        { q: t('How do I pre-register a visitor?', 'Paano magpa-rehistro ng bisita?'),
          a: t('Go to Home → Pre-Register, choose the type (Single, Batch, or Delivery), fill in the visitor name/s, purpose, and expected date, then confirm. The guard on duty will see the visitor on their schedule.',
               'Pumunta sa Home → Pre-Register, pumili ng uri (Single, Batch, o Delivery), ilagay ang pangalan ng bisita, layunin, at inaasahang petsa, tapos i-confirm. Makikita ng guard ang bisita sa kanilang schedule.') },
        { q: t('How do I notify the gate for a pick-up?', 'Paano ipaalam sa gate na may sundo?'),
          a: t('On the Home screen, tap "Notify Gate", choose if it is a ride-hailing pick-up, then confirm. The guard will see you at the top of their pick-up list marked as waiting.',
               'Sa Home screen, i-tap ang "Notify Gate", piliin kung ride-hailing ang sundo, tapos i-confirm. Makikita ka ng guard sa itaas ng listahan bilang naghihintay.') },
        { q: t('Where do I see my visitors?', 'Saan ko makikita ang mga bisita ko?'),
          a: t('The Home dashboard shows today’s visitors, and "Expected Visitors" shows your upcoming and past registrations with their status (Expected, Active, Departed).',
               'Ipinapakita ng Home dashboard ang bisita ngayong araw, at ang "Expected Visitors" ang nagpapakita ng nalalapit at nakaraang rehistro kasama ang status (Expected, Active, Departed).') },
      ],
    },
    {
      key: 'account',
      Icon: UserCog,
      title: t('Account Management', 'Pamamahala ng Account'),
      items: [
        { q: t('How do I change my password?', 'Paano ko papalitan ang password ko?'),
          a: t('Go to Profile → Password and Security → Change Password. Enter your current password, then your new password twice.',
               'Pumunta sa Profile → Password at Seguridad → Change Password. Ilagay ang kasalukuyang password, tapos ang bagong password nang dalawang beses.') },
        { q: t('I forgot my password.', 'Nakalimutan ko ang password ko.'),
          a: t('On the Sign In screen, tap "Forgot your password?". Enter your registered email, then type the verification code sent to that email and set a new password.',
               'Sa Sign In screen, i-tap ang "Forgot your password?". Ilagay ang naka-rehistrong email, tapos i-type ang verification code na ipinadala doon at maglagay ng bagong password.') },
        { q: t('How do I update my personal details?', 'Paano ko ia-update ang personal kong detalye?'),
          a: t('Your unit address, contact number, and email are managed by your HOA administrator. Contact them for any changes to your account details.',
               'Ang unit address, numero ng kontak, at email mo ay pinamamahalaan ng HOA administrator. Makipag-ugnayan sa kanila para sa anumang pagbabago.') },
        { q: t('How do I view my blocklist?', 'Paano ko makikita ang blocklist ko?'),
          a: t('Go to Profile → Blocklisted to see visitors that have been blocked. Blocklisting is handled through resolved complaints and approved by the admin.',
               'Pumunta sa Profile → Blocklisted para makita ang mga na-block na bisita. Ang pag-block ay dumadaan sa naresolbang reklamo at inaaprubahan ng admin.') },
      ],
    },
    {
      key: 'troubleshooting',
      Icon: Wrench,
      title: t('Troubleshooting', 'Pag-aayos ng Problema'),
      items: [
        { q: t('My visitor is not showing on the guard’s list.', 'Hindi lumalabas ang bisita ko sa listahan ng guard.'),
          a: t('Make sure the expected date is correct and that you tapped Confirm on the final step. Pull to refresh, or open "Expected Visitors" to confirm the registration was saved.',
               'Tiyaking tama ang inaasahang petsa at na-tap mo ang Confirm sa huling hakbang. I-refresh, o buksan ang "Expected Visitors" para tiyaking na-save ang rehistro.') },
        { q: t('The app is not loading or showing old data.', 'Hindi naglo-load o lumang datos ang lumalabas.'),
          a: t('Close and reopen the app, then check your internet connection. If it persists, sign out and sign back in.',
               'Isara at buksan muli ang app, tapos tingnan ang koneksyon sa internet. Kung nagpapatuloy, mag-sign out at mag-sign in ulit.') },
        { q: t('I did not receive my verification code.', 'Hindi ko natanggap ang verification code ko.'),
          a: t('Check your spam/junk folder and confirm you entered the same email registered by your admin. The code expires after 10 minutes — request a new one if needed.',
               'Tingnan ang spam/junk folder at tiyaking tama ang email na naka-rehistro ng admin. Nag-e-expire ang code pagkatapos ng 10 minuto — humiling ng bago kung kailangan.') },
        { q: t('The Notify Gate button is not working.', 'Hindi gumagana ang Notify Gate button.'),
          a: t('Make sure you selected whether it is a ride-hailing pick-up before tapping Notify Gate. If it still fails, check your connection and try again.',
               'Tiyaking napili mo kung ride-hailing ang sundo bago i-tap ang Notify Gate. Kung hindi pa rin gumagana, tingnan ang koneksyon at subukan ulit.') },
      ],
    },
    {
      key: 'security',
      Icon: ShieldCheck,
      title: t('Security & Privacy', 'Seguridad at Privacy'),
      items: [
        { q: t('Is my visitor’s ID photo stored?', 'Iniimbak ba ang litrato ng ID ng bisita ko?'),
          a: t('No. When a guard scans an ID, only the name is read for matching — the ID photo is never saved to the system.',
               'Hindi. Kapag nag-scan ang guard ng ID, pangalan lamang ang binabasa — hindi iniimbak sa sistema ang litrato ng ID.') },
        { q: t('Who can see my information?', 'Sino ang nakakakita ng impormasyon ko?'),
          a: t('Your details are visible to you, the guards on duty (for verification), and your HOA administrator. They are not shared with other residents.',
               'Nakikita ang detalye mo ng iyong sarili, ng guard na naka-duty (para sa pag-verify), at ng HOA administrator. Hindi ito ibinabahagi sa ibang residente.') },
        { q: t('How are my passwords protected?', 'Paano pinoprotektahan ang password ko?'),
          a: t('Passwords are stored securely as encrypted hashes. No one, including administrators, can see your actual password.',
               'Ligtas na naka-imbak ang password bilang encrypted hash. Walang makakakita ng tunay mong password, kahit ang admin.') },
        { q: t('Can other residents see who visits me?', 'Nakikita ba ng ibang residente kung sino ang bumibisita sa akin?'),
          a: t('No. Your visitor registrations and history are private to your account and the community’s guards and admin.',
               'Hindi. Pribado ang iyong mga rehistro at kasaysayan ng bisita — sa account mo lamang at sa guard at admin ng komunidad.') },
      ],
    },
  ];

  const q = search.toLowerCase();
  const filtered = !q
    ? TOPICS
    : TOPICS
        .map((topic) => ({
          ...topic,
          items: topic.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
        }))
        .filter((topic) => topic.title.toLowerCase().includes(q) || topic.items.length > 0);

  return (
    <div className="min-h-screen bg-cream pb-10 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-ink px-5 py-6 flex items-center gap-4">
        <button onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl text-ink shrink-0">‹</button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-white">{t('Help Center', 'Sentro ng Tulong')}</h1>
          <p className="text-white/70 text-sm">{t('Need assistance?', 'Kailangan ng tulong?')}</p>
        </div>
        <LangToggle />
      </header>

      <div className="px-4 space-y-5 mt-5">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-extrabold text-ink mb-4">{t('How can we help you?', 'Paano ka namin matutulungan?')}</h2>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-3 shadow-sm mb-6">
            <Search size={18} className="text-ink/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder={t('Search help articles', 'Maghanap ng help article')}
                   className="flex-1 outline-none text-ink placeholder-ink/40 bg-transparent" />
          </div>

          <h3 className="text-xl font-extrabold text-ink mb-3">{t('Popular Topics', 'Mga Popular na Paksa')}</h3>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-ink/50 py-6 text-sm">{t('No help articles found.', 'Walang nahanap na help article.')}</p>
            ) : (
              filtered.map((topic) => <TopicCard key={topic.key} Icon={topic.Icon} title={topic.title} items={topic.items} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
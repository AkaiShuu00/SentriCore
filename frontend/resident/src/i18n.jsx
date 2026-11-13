import { createContext, useContext, useState } from 'react';

// Magaan na i18n: t(english, tagalog) → ibabalik ang tamang wika base sa napiling language.
// Ginagamit LANG para sa mga EXPLANATION / DESCRIPTION text — hindi para sa data,
// pangalan, o mahahalagang label. Kung walang ibinigay na Tagalog, English ang default.
const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (en) => en });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('sentricore_lang') || 'en'; } catch { return 'en'; }
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('sentricore_lang', l); } catch { /* ignore */ }
  };
  const t = (en, tl) => (lang === 'tl' && tl != null ? tl : en);
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}

// SVG-icon na language switch na may dropdown (English / Tagalog).
// Dinisenyo para sa teal header (puting icon). Pindutin → lalabas ang pagpipilian.
export function LangToggle({ className = '' }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const options = [['en', 'English'], ['tl', 'Tagalog']];
  return (
    <div className={`relative ${className}`}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Language"
              className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white">
        {/* globe / languages icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-36">
            {options.map(([code, label]) => (
              <button key={code} onClick={() => { setLang(code); setOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center justify-between hover:bg-gray-50"
                      style={{ color: lang === code ? '#0F6E6E' : '#112D31' }}>
                {label}
                {lang === code && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
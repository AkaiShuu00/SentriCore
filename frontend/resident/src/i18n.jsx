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

// Reusable na toggle chip (EN / TL) — puwedeng ilagay sa kahit anong header o settings page.
export function LangToggle({ className = '' }) {
  const { lang, setLang } = useT();
  return (
    <div className={`inline-flex rounded-full bg-white shadow overflow-hidden text-[11px] font-bold ${className}`}>
      {[['en', 'EN'], ['tl', 'TL']].map(([code, label]) => (
        <button key={code} onClick={() => setLang(code)}
                className={`px-3 py-1 transition ${lang === code ? 'text-white' : 'text-ink'}`}
                style={lang === code ? { backgroundColor: '#0F6E6E' } : {}}>
          {label}
        </button>
      ))}
    </div>
  );
}
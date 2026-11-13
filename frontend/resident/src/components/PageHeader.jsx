import { useNavigate } from 'react-router-dom';

// Shared na teal gradient + wave header para sa buong resident app.
// Props:
//   title    — kung may ilalagay na heading SA BABA ng header (dark teal)
//   showBack — magpakita ng back button (SVG chevron, walang circle outline)
//   right    — optional na laman sa kanan (hal. <LangToggle/>)
export default function PageHeader({ title, showBack = false, right = null, onBack }) {
  const navigate = useNavigate();
  const DARK = '#0A4A4A';
  return (
    <>
      <header className="relative overflow-hidden px-5 pt-7 pb-10 rounded-b-[32px]"
              style={{ background: 'linear-gradient(135deg, #0F6E6E 0%, #0A4A4A 100%)' }}>
        {/* wave band (ibaba) */}
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 500 70"
             preserveAspectRatio="none" style={{ height: '48px' }}>
          <path d="M0,35 C130,75 370,-5 500,35 L500,70 L0,70 Z" fill="rgba(255,255,255,0.07)" />
          <path d="M0,45 C150,80 350,10 500,45 L500,70 L0,70 Z" fill="rgba(255,255,255,0.05)" />
        </svg>
        {/* faint ripples (taas-kanan) */}
        <svg className="pointer-events-none absolute -top-6 -right-6 opacity-20" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="140" cy="40" r="30" stroke="#fff" strokeWidth="2" />
          <circle cx="140" cy="40" r="52" stroke="#fff" strokeWidth="1.5" />
          <circle cx="140" cy="40" r="74" stroke="#fff" strokeWidth="1" />
        </svg>

        <div className="relative flex items-center justify-between min-h-[28px]">
          {showBack ? (
            <button onClick={onBack || (() => navigate(-1))} aria-label="Back" className="text-white -ml-1">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>

      {title && (
        <h1 className="px-5 mt-4 text-2xl font-extrabold tracking-wide" style={{ color: DARK }}>{title}</h1>
      )}
    </>
  );
}
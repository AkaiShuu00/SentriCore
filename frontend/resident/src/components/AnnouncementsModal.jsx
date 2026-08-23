// Reusable announcements modal — magagamit sa guard at resident home
const DEFAULT_ANNOUNCEMENTS = [
  { icon: '🔥', bg: 'bg-white',        text: 'Fire incident happening at Gemini Street' },
  { icon: '🛑', bg: 'bg-white',        text: 'Gate 1 temporarily closed' },
  { icon: '💧', bg: 'bg-yellow-100',   text: 'Water interruption at 11:00 PM today, June 2, 2026' },
  { icon: '🧑', bg: 'bg-red-100',      text: 'Homeowners meeting today at clubhouse, 10:30 AM' },
  { icon: '🛑', bg: 'bg-white',        text: 'CCTV maintenance ongoing at Gate 1' },
  { icon: '⚡', bg: 'bg-yellow-100',   text: 'Power interruption on June 6, 9:00 AM - 3:00 PM' },
  { icon: '🧑', bg: 'bg-red-100',      text: 'Election of HOA officers scheduled next month' },
];

export default function AnnouncementsModal({ items = DEFAULT_ANNOUNCEMENTS, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #E8F1EE 0%, #FFFFFF 60%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-ink text-center mb-5">ANNOUNCEMENTS</h2>

        {items.map((a, i) => (
          <div key={i}>
            <div className="flex items-center gap-4 py-4">
              <div className={`w-11 h-11 rounded-full ${a.bg} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                {a.icon}
              </div>
              <p className="font-semibold text-sm text-ink">{a.text}</p>
            </div>
            {i < items.length - 1 && <div className="border-b border-ink/10" />}
          </div>
        ))}

        <button
          onClick={onClose}
          className="w-full mt-5 bg-ink text-white font-bold py-3 rounded-full active:scale-95 transition"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
import { useNavigate } from 'react-router-dom';

export default function SelectUser() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="bg-cream w-full min-h-screen sm:min-h-0 sm:max-w-md flex flex-col items-center justify-center py-20 px-8"
           style={{ minHeight: '100vh' }}>
        <img src="/logo.jpg" alt="SentriCore" className="w-28 h-28 object-contain" />
        <h1 className="text-3xl font-extrabold text-ink tracking-wide mt-2"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.15)' }}>
          SENTRICORE
        </h1>
        <p className="text-ink/70 text-lg mt-6 mb-10">Select user</p>

        <div className="flex gap-5 w-full justify-center">
          {/* Resident */}
          <button
            onClick={() => navigate('/signin')}
            className="bg-white rounded-2xl shadow-md p-6 w-40 flex flex-col items-center transition-transform active:scale-95 hover:scale-105"
          >
            <div className="text-6xl mb-4">👤</div>
            <span className="font-semibold text-ink tracking-wide">RESIDENT</span>
          </button>

          {/* Guard */}
          <button
            onClick={() => alert('Guard app — separate build')}
            className="bg-white rounded-2xl shadow-md p-6 w-40 flex flex-col items-center transition-transform active:scale-95 hover:scale-105"
          >
            <div className="text-6xl mb-4">👮</div>
            <span className="font-semibold text-ink tracking-wide">GUARD</span>
          </button>
        </div>
      </div>
    </div>
  );
}
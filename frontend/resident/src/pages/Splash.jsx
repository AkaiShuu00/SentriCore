import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-0">
      {/* Cream oval container */}
      <div className="bg-cream w-full min-h-screen sm:min-h-0 sm:max-w-md sm:rounded-[50%/8%] flex flex-col items-center justify-center py-20"
           style={{ minHeight: '100vh' }}>
        <button
          onClick={() => navigate('/select-user')}
          className="flex flex-col items-center transition-transform active:scale-95 hover:scale-105"
        >
          <img src="/logo.jpg" alt="SentriCore" className="w-40 h-40 object-contain" />
          <h1 className="text-4xl font-extrabold text-ink tracking-wide mt-4"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.15)' }}>
            SENTRICORE
          </h1>
        </button>
        <p className="text-ink/70 text-lg mt-6">Click the logo to start</p>
      </div>
    </div>
  );
}
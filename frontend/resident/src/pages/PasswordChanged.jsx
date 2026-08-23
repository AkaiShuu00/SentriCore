import { useNavigate } from 'react-router-dom';

export default function PasswordChanged() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink/40 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-10 text-center">
        <div className="text-7xl mb-6">🏅</div>
        <h1 className="text-3xl font-extrabold text-ink mb-4">Password changed!</h1>
        <p className="text-ink/70 mb-8">
          You have successfully created a new password. Kindly click the button below to sign in again.
        </p>
        <button
          onClick={() => navigate('/signin')}
          className="w-full bg-ink text-white font-bold text-xl py-4 rounded-full active:scale-95 transition tracking-wide"
        >
          SIGN IN
        </button>
      </div>
    </div>
  );
}
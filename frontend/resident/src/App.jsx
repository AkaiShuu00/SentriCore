import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Shared ──
import Splash from './pages/Splash';
import SignIn from './pages/SignIn';

// ── Resident pages ──
import ForgotPassword from './pages/ForgotPassword';
import CreatePassword from './pages/CreatePassword';
import PasswordChanged from './pages/PasswordChanged';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import History from './pages/History';
import Profile from './pages/Profile';
import PasswordSecurity from './pages/PasswordSecurity';
import NotificationSettings from './pages/NotificationSettings';
import HelpCenter from './pages/HelpCenter';
import Blocklist from './pages/Blocklist';
import FAQs from './pages/FAQs';
import Terms from './pages/Terms';
import ContactGuard from './pages/ContactGuard';
import Complaints from './pages/Complaints';
import PreRegister from './pages/Preregister';

// ── Guard pages (gagawin natin — palitan/idagdag habang binubuo) ──
import GuardHome from './pages/guard/GuardHome';
import GuardSchedule from './pages/guard/GuardSchedule';
import GuardProfile from './pages/guard/GuardProfile';
import GuardLogs from './pages/guard/GuardLogs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Shared entry */}
        <Route path="/" element={<Splash />} />
        <Route path="/signin" element={<SignIn />} />

        {/* Resident */}
        <Route path="/home" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pre-register" element={<PreRegister />} />
        <Route path="/contact-guard" element={<ContactGuard />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/create-password" element={<CreatePassword />} />
        <Route path="/password-changed" element={<PasswordChanged />} />
        <Route path="/password-security" element={<PasswordSecurity />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/blocklist" element={<Blocklist />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/terms" element={<Terms />} />

        {/* Guard */}
        <Route path="/guard-home" element={<GuardHome />} />
        <Route path="/guard-schedule" element={<GuardSchedule />} /> 
        <Route path="/guard-profile" element={<GuardProfile />} />
        <Route path="/guard-logs" element={<GuardLogs />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
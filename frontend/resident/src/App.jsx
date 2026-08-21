import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/Splash';
import SelectUser from './pages/SelectUser';
import SignIn from './pages/SignIn';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/select-user" element={<SelectUser />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/create-password" element={<CreatePassword />} />
        <Route path="/password-changed" element={<PasswordChanged />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/home" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/password-security" element={<PasswordSecurity />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/blocklist" element={<Blocklist />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact-guard" element={<ContactGuard />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
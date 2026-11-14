import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Idle auto-logout ──
// Kapag walang interaction (mouse/keyboard/touch/scroll) nang IDLE_MS, awtomatikong
// magla-log out at babalik sa landing/sign-in. Sumasaklaw sa admin, resident, at guard.
// Palitan ang IDLE_MS kung gusto mong ibahin (5–10 min). Default: 7 minuto.
const IDLE_MS = 7 * 60 * 1000;

// Mga pahinang HINDI dapat kasama (landing / login / forgot-password, atbp.)
const PUBLIC_PATHS = ['/', '/signin', '/login', '/forgot-password', '/reset-password', '/landing'];

// Saan babalik pag na-logout (landing page). Baguhin kung iba ang route mo.
const LOGOUT_TO = '/signin';

export default function IdleLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const timer = useRef(null);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(location.pathname);
    const loggedIn = !!sessionStorage.getItem('sentricore_token');
    // Huwag tumakbo sa public pages o kung hindi naka-login
    if (isPublic || !loggedIn) return;

    const logout = () => {
      sessionStorage.removeItem('sentricore_token');
      sessionStorage.removeItem('sentricore_user');
      navigate(LOGOUT_TO, { replace: true });
    };

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // simulan ang timer

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [location.pathname, navigate]);

  return null; // walang UI
}
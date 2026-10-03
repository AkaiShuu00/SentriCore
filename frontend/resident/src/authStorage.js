// Per-tab authentication session storage.
// Gumagamit ng sessionStorage (hiwalay bawat browser tab) sa halip na localStorage
// (na shared sa lahat ng tab), para hindi mag-overwrite ang Admin/Guard/Resident
// tokens kapag magkakasabay na naka-login sa magkakaibang tab.

const TOKEN_KEY = 'sentricore_token';
const USER_KEY = 'sentricore_user';

export const saveSession = (token, user) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || '{}');
  } catch {
    return {};
  }
};

export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};
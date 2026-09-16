// src/authStorage.js
// Per-tab session storage — para HINDI mag-overwrite ang magkaibang account
// (resident/guard/admin) na naka-login sa magkaibang tab ng parehong browser.
//
// Gumagamit ng sessionStorage (hiwalay bawat tab). Kung gusto mong tumagal
// kahit sarado ang tab, palitan ang sessionStorage → localStorage — pero
// mawawala ulit ang multi-account separation.

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
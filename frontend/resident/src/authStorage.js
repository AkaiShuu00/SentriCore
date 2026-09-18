// src/authStorage.js
// Per-tab session storage — para HINDI mag-overwrite ang magkaibang account
// (resident/guard/admin) na naka-login sa magkaibang tab ng parehong browser.
//
// Gumagamit ng localStorage (hiwalay bawat tab). Kung gusto mong tumagal
// kahit sarado ang tab, palitan ang localStorage → localStorage — pero
// mawawala ulit ang multi-account separation.

const TOKEN_KEY = 'sentricore_token';
const USER_KEY = 'sentricore_user';

export const saveSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  } catch {
    return {};
  }
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
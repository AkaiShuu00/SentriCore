import axios from 'axios';

const API = 'http://localhost:3000/api';

// Axios instance na may auto-attach ng token
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentricore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Kung expired/invalid ang token → balik sa signin
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Optional: auto-logout kapag expired
      // localStorage.removeItem('sentricore_token');
      // window.location.href = '/signin';
    }
    return Promise.reject(err);
  }
);

// ── Registrations (resident) ──
export const createRegistration = (data) => api.post('/registrations', data);
export const getMyRegistrations = () => api.get('/registrations');
export const updateRegistration = (id, data) => api.put(`/registrations/${id}`, data);
export const deleteRegistration = (id) => api.delete(`/registrations/${id}`);

// ── Entry (guard) ──
export const matchVisitor = (params) => api.get('/entry/match', { params });
export const getActiveVisitors = () => api.get('/entry/active');
export const createGroupEntry = (data) => api.post('/entry/group', data);
export const recordExit = (id, data) => api.post(`/entry/${id}/exit`, data);
export const getResidentsForGuard = () => api.get('/entry/residents');

export default api;
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

// ── Resident profile ──
export const getMyProfile = () => api.get('/residents/me');

// ── Announcements (all logged-in) ──
export const getAnnouncements = () => api.get('/announcements');
export const createAnnouncement = (data) => api.post('/announcements', data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// ── Admin ──
export const getAllVisitorLogs = () => api.get('/entry/all-logs');
export const getAdminSummary = () => api.get('/entry/admin-summary');

// ── Admin: Residents ──
export const adminListResidents = () => api.get('/admin/residents');
export const adminResidentActive = (id) => api.get(`/admin/residents/${id}/active`);
export const adminAddResident = (data) => api.post('/admin/residents', data);
export const adminUpdateResident = (id, data) => api.put(`/admin/residents/${id}`, data);
export const adminResetResidentPassword = (id) => api.post(`/admin/residents/${id}/reset-password`);

// ── Admin: Guards ──
export const adminListGuards = () => api.get('/admin/guards');
export const adminGuardActivity = () => api.get('/admin/guards/activity');
export const adminAddGuard = (data) => api.post('/admin/guards', data);
export const adminUpdateGuard = (id, data) => api.put(`/admin/guards/${id}`, data);
export const adminAssignGate = (id, gateId) => api.post(`/admin/guards/${id}/assign`, { gateId });
export const adminResetGuardPassword = (id) => api.post(`/admin/guards/${id}/reset-password`);
export const adminDeleteGuard = (id) => api.delete(`/admin/guards/${id}`);

// ── Entry (guard) ──
export const matchVisitor = (params) => api.get('/entry/match', { params });
export const getActiveVisitors = () => api.get('/entry/active');
export const getHistory = () => api.get('/entry/history');
export const createGroupEntry = (data) => api.post('/entry/group', data);
export const recordExit = (id, data) => api.post(`/entry/${id}/exit`, data);
export const getResidentsForGuard = () => api.get('/entry/residents');
export const getCompanions = (params) => api.get('/entry/companions', { params });
export const getSchedule = () => api.get('/entry/schedule');

export default api;
import axios from 'axios';

// Relative na base URL — tumutugma sa SignIn.jsx/PreRegister.jsx ('/api').
// Gumagana ito sa laptop AT sa phone dahil dumadaan sa Vite proxy patungo sa backend.
// (Kung wala kang Vite proxy, palitan ito ng iyong laptop IP, hal:
//   const API = 'http://192.168.100.9:3000/api';  )
const API = '/api';

// Axios instance na may auto-attach ng token.
// Ang 'ngrok-skip-browser-warning' ay para hindi ibalik ng ngrok-free ang HTML
// warning page sa mga API call (na siyang dahilan ng "service unavailable" sa phone).
const api = axios.create({
  baseURL: API,
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

api.interceptors.request.use((config) => {
  // localStorage (hindi sessionStorage) — pare-pareho sa buong app
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

// ── Guards (Contact Guard, resident side) ──
export const getGuards = () => api.get('/guards/directory');

// ── Guard's own profile (full DB row: photo, employee_id, phone, email, gate, status) ──
export const getMyGuardProfile = () => api.get('/guards/me');

// ── Guard shift (time-in/out) ──
export const getMyShift = () => api.get('/guards/my-shift');
export const endGuardShift = () => api.post('/guards/end-shift');
export const adminGuardShifts = () => api.get('/guards/shifts');

// ── Gate pickup (resident notifies gate → guard sees waiting) ──
export const notifyGatePickup = (data) => api.post('/pickups', data);
export const getMyGatePickup = () => api.get('/pickups/mine');
export const getGatePickups = () => api.get('/pickups');
export const resolveGatePickup = (id) => api.put(`/pickups/${id}/done`);

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

// ── Admin: Reports ──
export const adminMonthlyReport = () => api.get('/admin/reports/monthly');
export const adminRecurrentReport = () => api.get('/admin/reports/recurrent');
export const adminAuditReport = (params) => api.get('/admin/reports/audit', { params });

// ── Complaints ──
export const createComplaint = (data) => api.post('/complaints', data);
export const getMyComplaints = () => api.get('/complaints/mine');
export const adminListComplaints = (params) => api.get('/admin/complaints', { params });
export const adminResolveComplaint = (id, data) => api.put(`/admin/complaints/${id}`, data);

// ── Notifications ──
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

// ── Blocklist (resident view) ──
export const getMyBlocklist = () => api.get('/blocklist');
// Guard: check kung ang pangalan ng bisita ay tumutugma sa blocklist
export const checkBlocklist = (name) => api.get('/blocklist/check', { params: { name } });

// ── Password ──
export const forgotPassword = (email) => api.post('/auth/forgot', { email });
export const resetPassword = (data) => api.post('/auth/reset', data);
export const changePassword = (data) => api.post('/auth/change-password', data);

// ── Entry (guard) ──
export const matchVisitor = (params) => api.get('/entry/match', { params });
export const getActiveVisitors = () => api.get('/entry/active');
export const getHistory = () => api.get('/entry/history');
export const createGroupEntry = (data) => api.post('/entry/group', data);
export const recordExit = (id, data) => api.post(`/entry/${id}/exit`, data);
export const getResidentsForGuard = () => api.get('/entry/residents');
export const getCompanions = (params) => api.get('/entry/companions', { params });
export const getSchedule = () => api.get('/entry/schedule');
export const getExpectedDeliveries = () => api.get('/entry/expected-deliveries');

export default api;
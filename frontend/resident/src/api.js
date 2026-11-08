import axios from 'axios';

// Relative na base URL — tumutugma sa SignIn.jsx/PreRegister.jsx ('/api').
const API = '/api';

const api = axios.create({
  baseURL: API,
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sentricore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Optional: auto-logout kapag expired (naka-off para hindi biglang mag-logout)
      // sessionStorage.removeItem('sentricore_token');
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

// ── Guard's own profile ──
export const getMyGuardProfile = () => api.get('/guards/me');

// ── Guard shift ──
export const getMyShift = () => api.get('/guards/my-shift');
export const endGuardShift = () => api.post('/guards/end-shift');
export const adminGuardShifts = () => api.get('/guards/shifts');

// ── Gate pickup ──
export const notifyGatePickup = (data) => api.post('/pickups', data);
export const getMyGatePickup = () => api.get('/pickups/mine');
export const getGatePickups = () => api.get('/pickups');
export const resolveGatePickup = (id) => api.put(`/pickups/${id}/done`);

// ── Announcements ──
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
export const adminDeleteResident = (id) => api.delete(`/admin/residents/${id}`);
export const adminListDeactivatedResidents = () => api.get('/admin/residents/deactivated');
export const adminResidentTransactions = (id, params) => api.get(`/admin/residents/${id}/transactions`, { params });

// ── Admin: own profile + public contact for guard ──
export const getMyAdminProfile = () => api.get('/admin/me');
export const updateMyAdminProfile = (data) => api.put('/admin/me', data);
export const getAdminContact = () => api.get('/admin/contact');

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
export const residentResolveComplaint = (id) => api.put(`/complaints/${id}/resolve`);
export const reopenComplaint = (id, data) => api.put(`/complaints/${id}/reopen`, data);
export const adminListComplaints = (params) => api.get('/admin/complaints', { params });
export const adminResolveComplaint = (id, data) => api.put(`/admin/complaints/${id}`, data);

// ── Guard Reports (resident-style flow: file → admin acknowledge → guard resolve/re-submit) ──
export const createGuardReport = (data) => api.post('/guard-reports', data);
export const getMyGuardReports = () => api.get('/guard-reports/mine');
export const resolveGuardReport = (id) => api.put(`/guard-reports/${id}/resolve`);
export const reopenGuardReport = (id, data) => api.put(`/guard-reports/${id}/reopen`, data);
export const adminGuardReports = () => api.get('/admin/guard-reports');
export const adminAckGuardReport = (id, data) => api.put(`/admin/guard-reports/${id}`, data);

// ── Notifications ──
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

// ── Blocklist ──
export const getMyBlocklist = () => api.get('/blocklist');
export const checkBlocklist = (name) => api.get('/blocklist/check', { params: { name } });

// ── Password ──
export const forgotPassword = (email) => api.post('/auth/forgot', { email });
export const resetPassword = (data) => api.post('/auth/reset', data);
export const changePassword = (data) => api.post('/auth/change-password', data);

// ── Entry (guard) ──
export const matchVisitor = (params) => api.get('/entry/match', { params });
export const getActiveVisitors = () => api.get('/entry/active');
export const getHistory = () => api.get('/entry/history');
export const getArrivals = () => api.get('/entry/arrivals');
export const createGroupEntry = (data) => api.post('/entry/group', data);
export const recordExit = (id, data) => api.post(`/entry/${id}/exit`, data);
export const getResidentsForGuard = () => api.get('/entry/residents');
export const getCompanions = (params) => api.get('/entry/companions', { params });
export const getSchedule = () => api.get('/entry/schedule');
export const getExpectedDeliveries = () => api.get('/entry/expected-deliveries');

export default api;
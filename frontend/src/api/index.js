import axios from 'axios';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API = axios.create({
  baseURL: isLocal ? 'http://localhost:8000/api/v1' : '/api/v1',
  withCredentials: true,
});

// Автоматически добавлять JWT-токен в заголовки
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Автоматическое обновление токена при 401 (исключая маршруты входа/рефреша)
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const res = await axios.post(`${API.defaults.baseURL}/auth/refresh`, { refresh_token: refresh });
        const { access_token, refresh_token } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return API(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const authAPI = {
  login: (username, password) =>
    API.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  loginEds: (cmsBase64, extraFields = {}) =>
    API.post('/auth/login/eds', { cms_base64: cmsBase64, ...extraFields }),
  refresh: (refreshToken) =>
    API.post('/auth/refresh', { refresh_token: refreshToken }),
  // [P1-FIX] Передаём refresh_token в теле запроса — бэкенд добавит его в blacklist
  logout: () => {
    const refresh_token = localStorage.getItem('refresh_token');
    return API.post('/auth/logout', refresh_token ? { refresh_token } : {});
  },
  sendOtp: (email, purpose = 'register') =>
    API.post('/auth/send-otp', { email, purpose }),
  verifyOtp: (email, code, purpose = 'register') =>
    API.post('/auth/verify-otp', { email, code, purpose }),
  registerSupplier: (data) =>
    API.post('/auth/register-supplier', data),
  resetPassword: (data) =>
    API.post('/auth/reset-password', data),
  checkEmail: (email) =>
    API.post('/auth/check-email', { email }),
};



// ===== TENDERS =====
export const tendersAPI = {
  list: (params) => API.get('/tenders', { params }),
  get: (id) => API.get(`/tenders/${id}`),
  myList: (params) => API.get('/tenders/my/list', { params }),
  create: (data) => API.post('/tenders', data),
  duplicate: (id) => API.post(`/tenders/${id}/duplicate`),
  update: (id, data) => API.patch(`/tenders/${id}`, data),
  publish: (id, edsHash) => API.post(`/tenders/${id}/publish`, { eds_hash: edsHash, cms_base64: edsHash }),
  cancel: (id, reason) => API.post(`/tenders/${id}/cancel`, { reason }),
  delete: (id) => API.delete(`/tenders/${id}`),
};

// ===== BIDS =====
export const bidsAPI = {
  submit: (data) => API.post('/bids', data),
  myBids: () => API.get('/bids/my'),
  getByTender: (tenderId) => API.get(`/bids/tender/${tenderId}`),
  updateStatus: (bidId, data) => API.patch(`/bids/${bidId}/status`, data),
  revoke: (bidId, data) => API.post(`/bids/${bidId}/revoke`, data),
  revokeByTender: (tenderId, data) => API.post(`/bids/tender/${tenderId}/revoke`, data),
  resubmit: (bidId, data) => API.post(`/bids/${bidId}/resubmit`, data),
  generateProtocol: (tenderId, edsHash) =>
    API.post(`/bids/tender/${tenderId}/protocol`, null, { params: { eds_hash: edsHash } }),
};

// ===== USERS =====
export const usersAPI = {
  me: () => API.get('/users/me'),
  updateProfile: (data) => API.put('/users/me', data),
  changePassword: (data) => API.post('/users/me/change-password', data),
  myCompany: () => API.get('/users/me/company'),
  registerCompany: (data) => API.post('/users/me/company', data),
  updateCompany: (data) => API.put('/users/me/company', data),
};

// ===== SUPPLIERS =====
export const suppliersAPI = {
  list: () => API.get('/suppliers'),
  get: (id) => API.get(`/suppliers/${id}`),
};

// ===== ADMIN =====
export const adminAPI = {
  listUsers: () => API.get('/admin/users'),
  createUser: (data) => API.post('/admin/users', data),
  blockUser: (id) => API.patch(`/admin/users/${id}/block`),
  unblockUser: (id) => API.patch(`/admin/users/${id}/unblock`),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  resetPassword: (id) => API.post(`/admin/users/${id}/reset-password`),
  auditLog: (limit = 100) => API.get('/admin/audit-log', { params: { limit } }),
  stats: () => API.get('/admin/stats'),
};

// ===== CATEGORIES =====
export const categoriesAPI = {
  list: () => API.get('/categories'),
  create: (data) => API.post('/categories', data),
  delete: (id) => API.delete(`/categories/${id}`),
};

// ===== NOTIFICATIONS =====
export const notificationsAPI = {
  list: () => API.get('/notifications'),
  markRead: (id) => API.patch(`/notifications/${id}/read`),
  delete: (id) => API.delete(`/notifications/${id}`),
};

// ===== EDS SESSIONS (Архитектура 2) =====
export const edsAPI = {
  createSession: (action = 'auth', targetId = null) => 
    API.post('/eds/session', { action, target_id: targetId }),
  verifySession: (connectionId, cmsBase64, extraData = {}) => {
    let cmsStr = cmsBase64;
    if (typeof cmsStr !== 'string') {
      if (Array.isArray(cmsStr) && cmsStr.length > 0) cmsStr = cmsStr[0];
      else if (typeof cmsStr === 'object' && cmsStr !== null) cmsStr = cmsStr.cms_base64 || cmsStr.cms || cmsStr.signatures?.[0] || '';
    }
    return API.post('/eds/verify-session', { connection_id: connectionId, cms_base64: String(cmsStr || ''), ...extraData });
  },
  getSessionStatus: (connectionId) => 
    API.get(`/eds/session/${connectionId}`),
};

export default API;

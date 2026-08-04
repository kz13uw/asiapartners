import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
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
        localStorage.clear();
        window.location.href = '/login';
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
  loginEds: (cmsBase64) =>
    API.post('/auth/login/eds', { cms_base64: cmsBase64 }),
  refresh: (refreshToken) =>
    API.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => API.post('/auth/logout'),
};

// ===== TENDERS =====
export const tendersAPI = {
  list: (params) => API.get('/tenders', { params }),
  get: (id) => API.get(`/tenders/${id}`),
  myList: (params) => API.get('/tenders/my/list', { params }),
  create: (data) => API.post('/tenders', data),
  update: (id, data) => API.patch(`/tenders/${id}`, data),
  publish: (id, edsHash) => API.post(`/tenders/${id}/publish`, null, { params: { eds_hash: edsHash } }),
  delete: (id) => API.delete(`/tenders/${id}`),
};

// ===== BIDS =====
export const bidsAPI = {
  submit: (data) => API.post('/bids', data),
  getByTender: (tenderId) => API.get(`/bids/tender/${tenderId}`),
  updateStatus: (bidId, data) => API.patch(`/bids/${bidId}/status`, data),
  generateProtocol: (tenderId, edsHash) =>
    API.post(`/bids/tender/${tenderId}/protocol`, null, { params: { eds_hash: edsHash } }),
};

// ===== USERS =====
export const usersAPI = {
  me: () => API.get('/users/me'),
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

export default API;

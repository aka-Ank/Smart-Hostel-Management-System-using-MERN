import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hostel_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const hasToken = Boolean(localStorage.getItem('hostel_token'));
    const isAuthRoute = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/student/login')
      || originalRequest?.url?.includes('/auth/register')
      || originalRequest?.url?.includes('/auth/student/register')
      || originalRequest?.url?.includes('/auth/refresh');

    // If 401 and not already retried — try to refresh token
    if (error.response?.status === 401 && !originalRequest?._retry && hasToken && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('hostel_token')}` }
        });
        localStorage.setItem('hostel_token', data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — logout
        localStorage.removeItem('hostel_token');
        localStorage.removeItem('hostel_user');
        localStorage.removeItem('hostel_login_time');
        sessionStorage.setItem('logout_reason', 'Your session expired. Please login again.');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login:           (data) => api.post('/auth/login', data),
  register:        (data) => api.post('/auth/register', data),
  studentLogin:    (data) => api.post('/auth/student/login', data),
  studentRegister: (data) => api.post('/auth/student/register', data),
  refresh:         ()     => api.post('/auth/refresh'),
  me:              ()     => api.get('/auth/me'),
};

export const adminAPI = {
  getAll:          () => api.get('/admins'),
  create:          (data) => api.post('/admins', data),
  updateStatus:    (id, isActive) => api.patch(`/admins/${id}/status`, { isActive }),
};

export const buildingAPI = {
  getAll:          () => api.get('/buildings'),
  create:          (data) => api.post('/buildings', data),
  update:          (id, data) => api.put(`/buildings/${id}`, data),
};

export const roomFeatureAPI = {
  getAll: () => api.get('/room-features'),
  create: (data) => api.post('/room-features', data),
  remove: (id) => api.delete(`/room-features/${id}`),
};

// Admin — Students management
export const studentAPI = {
  getAll:       (params)      => api.get('/students', { params }),
  getById:      (id)          => api.get(`/students/${id}`),
  create:       (data)        => api.post('/students', data),
  update:       (id, data)    => api.put(`/students/${id}`, data),
  approveDetails: (id)        => api.patch(`/students/${id}/approve-details`),
  reviewFees:   (id, data)    => api.patch(`/students/${id}/fees/review`, data),
  feeProofUrl:  (studentId, proofId) => `${API_BASE}/students/${studentId}/fees/proofs/${proofId}`,
  delete:       (id)          => api.delete(`/students/${id}`),
  allocateRoom: (studentId, roomId) => api.post(`/students/${studentId}/allocate-room`, { roomId }),
  vacateRoom:   (studentId)   => api.post(`/students/${studentId}/vacate-room`),
};

// Rooms
export const roomAPI = {
  getAll:   (params)   => api.get('/rooms', { params }),
  getById:  (id)       => api.get(`/rooms/${id}`),
  getStats: ()         => api.get('/rooms/stats'),
  getPublicSummary: () => api.get('/rooms/public-summary'),
  create:   (data)     => api.post('/rooms', data),
  bulkCreate: (data)   => api.post('/rooms/bulk-create', data),
  bulkUpdate: (data)   => api.post('/rooms/bulk-update', data),
  bulkDelete: (data)   => api.post('/rooms/bulk-delete', data),
  update:   (id, data) => api.put(`/rooms/${id}`, data),
  delete:   (id)       => api.delete(`/rooms/${id}`),
};

// Student Portal
export const studentPortalAPI = {
  getProfile:        ()       => api.get('/student-portal/profile'),
  updateProfile:     (data)   => api.put('/student-portal/profile', data),
  getAvailableRooms: (params) => api.get('/student-portal/available-rooms', { params }),
  selectRoom:        (roomId) => api.post('/student-portal/select-room', { roomId }),
  getRoomChangeRequests: ()   => api.get('/student-portal/room-change-requests'),
  getMyAllocations:  ()       => api.get('/student-portal/my-allocations'),
  getFees:           ()       => api.get('/student-portal/fees'),
  uploadFeeProofs:   (formData) => api.post('/student-portal/fees/proofs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  feeProofUrl:       (proofId) => `${API_BASE}/student-portal/fees/proofs/${proofId}`,
};

export const roomChangeRequestAPI = {
  getAll:       (params) => api.get('/room-change-requests', { params }),
  review:       (id, data) => api.patch(`/room-change-requests/${id}/review`, data),
  getMine:      () => api.get('/room-change-requests/mine/list'),
  create:       (data) => api.post('/room-change-requests/mine', data),
  updateMine:   (id, data) => api.put(`/room-change-requests/mine/${id}`, data),
};

export default api;

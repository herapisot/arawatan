import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Optionally redirect to login
      if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================
export const authApi = {
  register: (data: {
    first_name: string;
    last_name: string;
    email: string;
    student_id: string;
    campus: string;
    user_type: string;
    password: string;
    password_confirmation: string;
  }) => api.post('/register', data),

  login: (email: string, password: string) =>
    api.post('/login', { email, password }),

  logout: () => api.post('/logout'),

  getUser: () => api.get('/user'),
};

// ==================== Items ====================
export const itemsApi = {
  browse: (params?: {
    search?: string;
    category?: string;
    campus?: string;
    condition?: string;
    sort?: string;
    page?: number;
    per_page?: number;
  }) => api.get('/items', { params }),

  getItem: (id: number | string) => api.get(`/items/${id}`),

  createItem: (formData: FormData) =>
    api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateItem: (id: number, data: Record<string, unknown>) =>
    api.put(`/items/${id}`, data),

  deleteItem: (id: number) => api.delete(`/items/${id}`),

  myItems: () => api.get('/user/items'),

  reportItem: (id: number, reason: string) =>
    api.post(`/items/${id}/report`, { reason }),
};

// ==================== Transactions ====================
export const transactionsApi = {
  requestItem: (itemId: number) =>
    api.post(`/items/${itemId}/request`),

  getTransaction: (id: number) =>
    api.get(`/transactions/${id}`),

  approve: (id: number) =>
    api.put(`/transactions/${id}/approve`),

  startMeeting: (id: number) =>
    api.put(`/transactions/${id}/meeting`),

  complete: (id: number) =>
    api.put(`/transactions/${id}/complete`),

  uploadProof: (id: number, formData: FormData) =>
    api.post(`/transactions/${id}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  cancel: (id: number) =>
    api.put(`/transactions/${id}/cancel`),

  myRequests: () => api.get('/user/requests'),

  myDonations: () => api.get('/user/donations'),
};

// ==================== Verification ====================
export const verificationApi = {
  upload: (formData: FormData) =>
    api.post('/verification/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  status: () => api.get('/verification/status'),
};

// ==================== Chat ====================
export const chatApi = {
  getConversations: () => api.get('/conversations'),

  getMessages: (conversationId: number, page?: number) =>
    api.get(`/conversations/${conversationId}/messages`, { params: { page } }),

  sendMessage: (conversationId: number, data: FormData | { text: string }) => {
    if (data instanceof FormData) {
      return api.post(`/conversations/${conversationId}/messages`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/conversations/${conversationId}/messages`, data);
  },

  startConversation: (itemId: number, recipientId: number) =>
    api.post('/conversations/start', { item_id: itemId, recipient_id: recipientId }),
};

// ==================== Gallery ====================
export const galleryApi = {
  getPosts: (params?: { page?: number; per_page?: number }) =>
    api.get('/gallery', { params }),

  myPosts: () => api.get('/gallery/mine'),

  createPost: (formData: FormData) =>
    api.post('/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  toggleLike: (postId: number) =>
    api.post(`/gallery/${postId}/like`),
};

// ==================== Leaderboard ====================
export const leaderboardApi = {
  getLeaderboard: (period?: string) =>
    api.get('/leaderboard', { params: { period } }),
};

// ==================== Profile ====================
export const profileApi = {
  getProfile: () => api.get('/user/profile'),

  updateProfile: (formData: FormData) =>
    api.put('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getPublicProfile: (userId: number) =>
    api.get(`/users/${userId}`),
};

// ==================== Notifications ====================
export const notificationApi = {
  getNotifications: (page?: number) =>
    api.get('/notifications', { params: { page } }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: number) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),
};

// ==================== Admin ====================
export const adminApi = {
  analytics: () => api.get('/admin/analytics'),

  getVerifications: (status?: string) =>
    api.get('/admin/verifications', { params: { status } }),

  approveVerification: (id: number) =>
    api.post(`/admin/verifications/${id}/approve`),

  rejectVerification: (id: number, reason: string) =>
    api.post(`/admin/verifications/${id}/reject`, { rejection_reason: reason }),

  getModeration: (params?: { status?: string; severity?: string }) =>
    api.get('/admin/moderation', { params }),

  approveFalsePositive: (id: number) =>
    api.post(`/admin/moderation/${id}/approve`),

  removeItem: (id: number, enforcementAction?: string) =>
    api.post(`/admin/moderation/${id}/remove`, { enforcement_action: enforcementAction }),
};

export default api;

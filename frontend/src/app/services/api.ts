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

  getItem: (encryptedId: string) => api.get(`/items/${encryptedId}`),

  createItem: (formData: FormData) =>
    api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateItem: (encryptedId: string, data: Record<string, unknown>) =>
    api.put(`/items/${encryptedId}`, data),

  deleteItem: (encryptedId: string) => api.delete(`/items/${encryptedId}`),

  getCustomCategories: () => api.get('/items/custom-categories'),

  myItems: () => api.get('/user/items'),

  reportItem: (encryptedId: string, reason: string) =>
    api.post(`/items/${encryptedId}/report`, { reason }),
};

// ==================== Transactions ====================
export const transactionsApi = {
  requestItem: (encryptedItemId: string) =>
    api.post(`/items/${encryptedItemId}/request`),

  getTransaction: (encryptedId: string) =>
    api.get(`/transactions/${encryptedId}`),

  approve: (encryptedId: string) =>
    api.put(`/transactions/${encryptedId}/approve`),

  startMeeting: (encryptedId: string) =>
    api.put(`/transactions/${encryptedId}/meeting`),

  complete: (encryptedId: string) =>
    api.put(`/transactions/${encryptedId}/complete`),

  uploadProof: (encryptedId: string, formData: FormData) =>
    api.post(`/transactions/${encryptedId}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  cancel: (encryptedId: string) =>
    api.put(`/transactions/${encryptedId}/cancel`),

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

  getMessages: (encryptedConversationId: string, page?: number) =>
    api.get(`/conversations/${encryptedConversationId}/messages`, { params: { page } }),

  sendMessage: (encryptedConversationId: string, data: FormData | { text: string }) => {
    if (data instanceof FormData) {
      return api.post(`/conversations/${encryptedConversationId}/messages`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/conversations/${encryptedConversationId}/messages`, data);
  },

  startConversation: (encryptedItemId: string, encryptedRecipientId: string) =>
    api.post('/conversations/start', { item_id: encryptedItemId, recipient_id: encryptedRecipientId }),
};

// ==================== Forum ====================
export const forumApi = {
  getPosts: (params?: { page?: number; per_page?: number }) =>
    api.get('/forum', { params }),

  myPosts: () => api.get('/forum/mine'),

  createPost: (formData: FormData) =>
    api.post('/forum', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  toggleLike: (encryptedPostId: string) =>
    api.post(`/forum/${encryptedPostId}/like`),
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

  getPublicProfile: (encryptedUserId: string) =>
    api.get(`/users/${encryptedUserId}`),
};

// ==================== Notifications ====================
export const notificationApi = {
  getNotifications: (page?: number) =>
    api.get('/notifications', { params: { page } }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (encryptedId: string) =>
    api.put(`/notifications/${encryptedId}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),
};

// ==================== Admin ====================
export const adminApi = {
  analytics: () => api.get('/admin/analytics'),

  getVerifications: (status?: string) =>
    api.get('/admin/verifications', { params: { status } }),

  approveVerification: (encryptedId: string) =>
    api.post(`/admin/verifications/${encryptedId}/approve`),

  rejectVerification: (encryptedId: string, reason: string) =>
    api.post(`/admin/verifications/${encryptedId}/reject`, { rejection_reason: reason }),

  getModeration: (params?: { status?: string; severity?: string }) =>
    api.get('/admin/moderation', { params }),

  approveFalsePositive: (encryptedId: string) =>
    api.post(`/admin/moderation/${encryptedId}/approve`),

  removeItem: (encryptedId: string, enforcementAction?: string) =>
    api.post(`/admin/moderation/${encryptedId}/remove`, { enforcement_action: enforcementAction }),

  // Forum Approval
  getForumPosts: (status?: string) =>
    api.get('/admin/forum', { params: { status } }),

  approveForumPost: (encryptedId: string) =>
    api.post(`/admin/forum/${encryptedId}/approve`),

  rejectForumPost: (encryptedId: string, reason: string) =>
    api.post(`/admin/forum/${encryptedId}/reject`, { reason }),
};

export default api;

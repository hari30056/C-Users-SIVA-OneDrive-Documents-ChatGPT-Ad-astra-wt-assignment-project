import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: extract response error message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'An unexpected error occurred';
    const code = errorData?.code || 'UNKNOWN_ERROR';
    return Promise.reject({ message, code, status: error.response?.status, details: errorData?.details });
  }
);

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials).then((r) => r.data),
    register: (data: { name: string; email: string; password: string; role?: string; organizationName?: string }) =>
      apiClient.post('/auth/register', data).then((r) => r.data),
    getMe: () => apiClient.get('/auth/me').then((r) => r.data),
  },

  events: {
    getPublic: (params?: Record<string, any>) =>
      apiClient.get('/events', { params }).then((r) => r.data),
    getById: (id: string) => apiClient.get(`/events/${id}`).then((r) => r.data),
    getAvailability: (id: string) => apiClient.get(`/events/${id}/availability`).then((r) => r.data),
    getOrganizerEvents: () => apiClient.get('/organizer/events').then((r) => r.data),
    create: (data: any) => apiClient.post('/organizer/events', data).then((r) => r.data),
    update: (id: string, data: any) => apiClient.put(`/organizer/events/${id}`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/organizer/events/${id}`).then((r) => r.data),
    addTier: (eventId: string, data: any) => apiClient.post(`/organizer/events/${eventId}/tiers`, data).then((r) => r.data),
  },

  reservations: {
    createHold: (eventId: string, items: Array<{ ticketTierId: string; quantity: number }>) =>
      apiClient.post(`/events/${eventId}/reservations`, { items }).then((r) => r.data),
    getById: (id: string) => apiClient.get(`/reservations/${id}`).then((r) => r.data),
    getMy: () => apiClient.get('/reservations/me').then((r) => r.data),
    cancel: (id: string) => apiClient.delete(`/reservations/${id}`).then((r) => r.data),
  },

  orders: {
    checkout: (reservationId: string) =>
      apiClient.post('/orders', { reservationId }).then((r) => r.data),
    getById: (id: string) => apiClient.get(`/orders/${id}`).then((r) => r.data),
    getMy: () => apiClient.get('/orders/me').then((r) => r.data),
    getOrganizerOrders: () => apiClient.get('/organizer/orders').then((r) => r.data),
    getAllAdmin: () => apiClient.get('/admin/orders').then((r) => r.data),
  },

  payments: {
    process: (data: { orderId: string; simulateFailure?: boolean; paymentMethod?: string }) =>
      apiClient.post('/payments/process', data).then((r) => r.data),
    getStatus: (transactionId: string) =>
      apiClient.get(`/payments/${transactionId}`).then((r) => r.data),
  },

  tickets: {
    getMy: () => apiClient.get('/tickets/me').then((r) => r.data),
    getById: (id: string) => apiClient.get(`/tickets/${id}`).then((r) => r.data),
    verify: (id: string) => apiClient.post(`/tickets/${id}/verify`).then((r) => r.data),
  },

  analytics: {
    getOrganizer: () => apiClient.get('/organizer/analytics').then((r) => r.data),
    getEvent: (eventId: string) => apiClient.get(`/organizer/events/${eventId}/analytics`).then((r) => r.data),
    getPlatform: () => apiClient.get('/admin/analytics').then((r) => r.data),
  },

  admin: {
    getUsers: () => apiClient.get('/admin/users').then((r) => r.data),
    getOrganizers: () => apiClient.get('/admin/organizers').then((r) => r.data),
    updateOrganizerStatus: (id: string, status: string) =>
      apiClient.put(`/admin/organizers/${id}/status`, { status }).then((r) => r.data),
    getEvents: () => apiClient.get('/admin/events').then((r) => r.data),
    getOrders: () => apiClient.get('/admin/orders').then((r) => r.data),
    getTransactions: () => apiClient.get('/admin/transactions').then((r) => r.data),
    getHealth: () => apiClient.get('/health').then((r) => r.data),
  },
};

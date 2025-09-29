// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

// ----- Interceptors -----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    }

    if (error?.response?.status === 500) {
      console.error('Server Error Details:', {
        endpoint: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status,
        data: error?.response?.data,
        headers: error?.config?.headers,
      });
    }
    return Promise.reject(error);
  }
);

// ----- Equipment service -----
export const equipmentService = {
  // All equipment (supports params like { page, limit, q, status })
  getAll: (params = {}) => api.get('/equipment', { params }),

  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getStats: () => api.get('/equipment/stats'),

  // Only equipment under maintenance (page/limit/q also supported)
  // NOTE: If your backend expects 'Maintenance' instead of 'under_maintenance',
  // change the value below accordingly.
  getUnderMaintenance: (params = {}) =>
    api.get('/equipment', {
      params: { status: 'under_maintenance', ...params },
    }),

  // Maintenance logs (per equipment)
  getMaintenanceLogs: async (equipmentId) => {
    try {
      return await api.get(`/equipment/${equipmentId}/maintenance`);
    } catch (error) {
      console.error(`Error fetching maintenance logs for equipment ${equipmentId}:`,
        error?.response?.data || error.message);
      throw error;
    }
  },

  addMaintenanceLog: async (equipmentId, data) => {
    try {
      // Minimal formatting: backend typically reads these keys
      const payload = {
        maintenance_type: data.maintenance_type,
        description: data.description,
        date: data.date,
      };
      return await api.post(`/equipment/${equipmentId}/maintenance`, payload);
    } catch (error) {
      console.error(`Error adding maintenance log for equipment ${equipmentId}:`,
        error?.response?.data || error.message);
      throw error;
    }
  },
};

// ----- Users -----
export const userService = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
};

// ----- Maintenance (global) -----
export const maintenanceService = {
  getLogs: async () => {
    try {
      return await api.get('/maintenance');
    } catch (error) {
      console.error('Error fetching maintenance logs:',
        error?.response?.data || error.message);
      throw error;
    }
  },
  createLog: async (data) => {
    try {
      return await api.post('/maintenance', data);
    } catch (error) {
      console.error('Error creating maintenance log:',
        error?.response?.data || error.message);
      throw error;
    }
  },
};

export default api;

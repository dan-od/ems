// src/services/api.js
import axios from 'axios';

const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    console.log('Using env variable:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  const hostname = window.location.hostname;
  console.log('Hostname detected:', hostname);

  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('Returning localhost URL');
    return 'http://localhost:3001/api';
  }
  
  const url = `http://${hostname}:3001/api`;
  console.log('Returning IP URL:', url);
  return url;
};

const API_URL = getApiUrl();
console.log('API_URL calculated as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
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
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
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
  getMyAssigned: () => api.get('/equipment/my-assigned'),
  getAssignmentHistory: (limit = 20) => api.get('/equipment/assignment-history', { params: { limit } }),
  reportIssue: (equipmentId, data) => api.post(`/equipment/${equipmentId}/report-issue`, data),

  // Only equipment under maintenance (page/limit/q also supported)
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

// ----- Requests -----
export const requestService = {
  getAll: () => api.get('/requests'),
  getMyRequests: () => api.get('/requests/my-requests'),
  getPending: () => api.get('/requests/dashboard/pending'),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  approve: (id, data) => api.post(`/requests/${id}/approve`, data),
  reject: (id, data) => api.post(`/requests/${id}/reject`, data),
  transfer: (id, data) => api.post(`/requests/${id}/transfer`, data),
};

// ----- Auth -----
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
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

// ----- Departments -----
export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// ----- Dashboard -----
export const dashboardService = {
  getEngineerStats: () => api.get('/dashboard/engineer-stats'),
  getManagerStats: (deptId) => api.get('/dashboard/manager-stats', { params: { deptId } }),
  getAdminStats: () => api.get('/dashboard/admin-stats'),
};

// Add field reports service
export const fieldReportsService = {
  submit: (data) => api.post('/field-reports', data),
  getMyReports: (params) => api.get('/field-reports/my-reports', { params }),
  getDepartmentReports: (deptId) => api.get('/field-reports/department', { params: { deptId } }),
  getById: (id) => api.get(`/field-reports/${id}`),
  review: (id, data) => api.patch(`/field-reports/${id}/review`, data),
  delete: (id) => api.delete(`/field-reports/${id}`)
};

export default api;
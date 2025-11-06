// ems-frontend/src/services/api.js
// FIXED - Smart 401 handling to prevent logout on request errors

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

// ----- Request Interceptor -----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----- Response Interceptor - FIXED! -----
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method.toUpperCase()} ${response.config.url} → ${response.status}`);
    return response;
  },
  (error) => {
    // Log detailed error
    console.error('❌ API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // ✅ SMART 401 HANDLING - Only logout on ACTUAL auth failures
    if (error?.response?.status === 401) {
      const errorMessage = error.response?.data?.error || '';
      
      // Check if this is an actual authentication failure
      const isAuthFailure = 
        errorMessage.toLowerCase().includes('token') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('authentication') ||
        error.config?.url?.includes('/auth/') ||
        !localStorage.getItem('token'); // No token exists
      
      if (isAuthFailure) {
        console.warn('🚫 Authentication failure detected - logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          window.location.href = '/';
        }
      } else {
        // This is a permission/validation error, not auth failure
        console.warn('⚠️ 401 error but not an auth failure:', errorMessage);
        // Let the component handle it via catch block
      }
    }

    // Log 500 errors
    if (error?.response?.status === 500) {
      console.error('Server Error Details:', {
        endpoint: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status,
        data: error?.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

// ----- Equipment service -----
export const equipmentService = {
  getAll: (params = {}) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getStats: () => api.get('/equipment/stats'),
  getMyAssigned: () => api.get('/equipment/my-assigned'),
  getAssignmentHistory: (limit = 20) => api.get('/equipment/assignment-history', { params: { limit } }),
  reportIssue: (equipmentId, data) => api.post(`/equipment/${equipmentId}/report-issue`, data),
  getUnderMaintenance: (params = {}) =>
    api.get('/equipment', {
      params: { status: 'under_maintenance', ...params },
    }),
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
        hours_at_service: data.hours_at_service,
        performed_by: data.performed_by
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

// ----- Field Reports -----
export const fieldReportsService = {
  submit: (data) => api.post('/field-reports', data),
  upload: (formData) => api.post('/field-reports/upload', formData),
  getAll: () => api.get('/field-reports'),
  getMyReports: (params) => api.get('/field-reports/my-reports', { params }),
  getDepartmentReports: (deptId) => api.get('/field-reports/department', { params: { deptId } }),
  getById: (id) => api.get(`/field-reports/${id}`),
  review: (id, data) => api.patch(`/field-reports/${id}/review`, data),
  download: (id) => api.get(`/field-reports/download/${id}`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/field-reports/${id}`)
};

// ----- Activity Logs -----
export const activityService = {
  getLogs: (params) => api.get('/activity-logs', { params }),
  getStats: () => api.get('/activity-logs/stats'),
};

// ----- Consumables / Inventory -----
export const inventoryService = {
  getAll: (params = {}) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust`, data),
  getTransactions: (id) => api.get(`/inventory/${id}/transactions`),
};

// ----- Assignments -----
export const assignmentService = {
  getAll: () => api.get('/assignments'),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  return: (id, data) => api.post(`/assignments/${id}/return`, data),
};

// ----- Issues (Issuing Items) -----
export const issueService = {
  getAll: () => api.get('/issues'),
  getById: (id) => api.get(`/issues/${id}`),
  create: (data) => api.post('/issues', data),
  approve: (id, data) => api.post(`/issues/${id}/approve`, data),
  reject: (id, data) => api.post(`/issues/${id}/reject`, data),
};

// ----- Assets (Non-Consumables) -----
export const assetService = {
  getAll: (params = {}) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
};

export default api;
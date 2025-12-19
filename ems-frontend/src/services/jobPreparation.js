import api from './api';

export const jobPreparationService = {
  // Get all job preparations
  getAll: (params = {}) => {
    return api.get('/job-preparations', { params });
  },

  // Get single job preparation
  getById: (id) => {
    return api.get(`/job-preparations/${id}`);
  },

  // Create job preparation
  create: (data) => {
    return api.post('/job-preparations', data);
  },

  // Update job preparation
  update: (id, data) => {
    return api.put(`/job-preparations/${id}`, data);
  },

  // Add items to job
  addItems: (id, items) => {
    return api.post(`/job-preparations/${id}/items`, { items });
  },

  // Update item
  updateItem: (jobId, itemId, data) => {
    return api.put(`/job-preparations/${jobId}/items/${itemId}`, data);
  },

  // Delete item
  deleteItem: (jobId, itemId) => {
    return api.delete(`/job-preparations/${jobId}/items/${itemId}`);
  },

  // Submit for approval
  submit: (id) => {
    return api.post(`/job-preparations/${id}/submit`);
  },

  // Manager review
  review: (id, action, review_notes) => {
    return api.post(`/job-preparations/${id}/review`, { action, review_notes });
  },

  // Pre-job inspections
  getPreJobInspections: (jobId) => {
    return api.get(`/job-inspections/prejob/${jobId}`);
  },

  createPreJobInspection: (formData) => {
    return api.post('/job-inspections/prejob', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updatePreJobInspection: (id, formData) => {
    return api.put(`/job-inspections/prejob/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  approvePreJobInspection: (id, approval_notes) => {
    return api.post(`/job-inspections/prejob/${id}/approve`, { approval_notes });
  },

  // Post-job inspections
  getPostJobInspections: (jobId) => {
    return api.get(`/job-inspections/postjob/${jobId}`);
  },

  createPostJobInspection: (formData) => {
    return api.post('/job-inspections/postjob', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updatePostJobInspection: (id, formData) => {
    return api.put(`/job-inspections/postjob/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  approvePostJobInspection: (id, approval_notes) => {
    return api.post(`/job-inspections/postjob/${id}/approve`, { approval_notes });
  }
};
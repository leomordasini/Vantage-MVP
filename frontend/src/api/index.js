import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────
export const adminApi = {
  // Customers
  listCustomers: () => api.get('/admin/customers/'),
  createCustomer: (data) => api.post('/admin/customers/', data),
  updateCustomer: (id, data) => api.put(`/admin/customers/${id}/`, data),
  deleteCustomer: (id) => api.delete(`/admin/customers/${id}/`),

  // Direct Reports
  listDirectReports: () => api.get('/admin/direct-reports/'),
  createDirectReport: (data) => api.post('/admin/direct-reports/', data),
  updateDirectReport: (id, data) => api.put(`/admin/direct-reports/${id}/`, data),
  deleteDirectReport: (id) => api.delete(`/admin/direct-reports/${id}/`),

  // Projects
  listProjects: () => api.get('/admin/projects/'),
  createProject: (data) => api.post('/admin/projects/', data),
  updateProject: (id, data) => api.put(`/admin/projects/${id}/`, data),
  deleteProject: (id) => api.delete(`/admin/projects/${id}/`),
}

// ─────────────────────────────────────────
// Customers
// ─────────────────────────────────────────
export const customersApi = {
  list: () => api.get('/customers/'),
  get: (id) => api.get(`/customers/${id}/`),
  update: (id, data) => api.patch(`/customers/${id}/`, data),

  addContact: (customerId, data) => api.post(`/customers/${customerId}/contacts/`, data),
  updateContact: (customerId, contactId, data) =>
    api.put(`/customers/${customerId}/contacts/${contactId}/`, data),
  deleteContact: (customerId, contactId) =>
    api.delete(`/customers/${customerId}/contacts/${contactId}/`),
}

// ─────────────────────────────────────────
// Direct Reports
// ─────────────────────────────────────────
export const directReportsApi = {
  list: () => api.get('/direct-reports/'),
  get: (id) => api.get(`/direct-reports/${id}/`),

  addNote: (drId, data) => api.post(`/direct-reports/${drId}/notes/`, data),
  uploadNote: (drId, formData) =>
    api.post(`/direct-reports/${drId}/notes/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteNote: (drId, noteId) => api.delete(`/direct-reports/${drId}/notes/${noteId}/`),

  addAchievement: (drId, formData) =>
    api.post(`/direct-reports/${drId}/achievements/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAchievement: (drId, achId) =>
    api.delete(`/direct-reports/${drId}/achievements/${achId}/`),
}

// ─────────────────────────────────────────
// Projects
// ─────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}/`),
  update: (id, data) => api.patch(`/projects/${id}/`, data),

  addUpdate: (projectId, data) => api.post(`/projects/${projectId}/updates/`, data),
  deleteUpdate: (projectId, updateId) =>
    api.delete(`/projects/${projectId}/updates/${updateId}/`),
}

// ─────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────
export const tasksApi = {
  list: (params) => api.get('/tasks/', { params }),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.patch(`/tasks/${id}/`, data),
  delete: (id) => api.delete(`/tasks/${id}/`),
}

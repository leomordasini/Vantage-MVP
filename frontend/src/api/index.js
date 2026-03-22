import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ─────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard/'),
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────
export const adminApi = {
  listCustomers: () => api.get('/admin/customers/'),
  createCustomer: (data) => api.post('/admin/customers/', data),
  updateCustomer: (id, data) => api.put(`/admin/customers/${id}/`, data),
  deleteCustomer: (id) => api.delete(`/admin/customers/${id}/`),

  listDirectReports: () => api.get('/admin/direct-reports/'),
  createDirectReport: (data) => api.post('/admin/direct-reports/', data),
  updateDirectReport: (id, data) => api.put(`/admin/direct-reports/${id}/`, data),
  deleteDirectReport: (id) => api.delete(`/admin/direct-reports/${id}/`),

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

  // Update log
  addUpdate: (customerId, data) => api.post(`/customers/${customerId}/updates/`, data),
  deleteUpdate: (customerId, updateId) => api.delete(`/customers/${customerId}/updates/${updateId}/`),

  // Contacts
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

  // 1:1 Notes
  addNote: (drId, data) => api.post(`/direct-reports/${drId}/notes/`, data),
  uploadNote: (drId, formData) =>
    api.post(`/direct-reports/${drId}/notes/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteNote: (drId, noteId) => api.delete(`/direct-reports/${drId}/notes/${noteId}/`),

  // Achievements
  addAchievement: (drId, formData) =>
    api.post(`/direct-reports/${drId}/achievements/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAchievement: (drId, achId) =>
    api.delete(`/direct-reports/${drId}/achievements/${achId}/`),

  // Update log
  addDrUpdate: (drId, data) => api.post(`/direct-reports/${drId}/updates/`, data),
  deleteDrUpdate: (drId, updateId) =>
    api.delete(`/direct-reports/${drId}/updates/${updateId}/`),
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

// ─────────────────────────────────────────
// Meetings
// ─────────────────────────────────────────
export const meetingsApi = {
  list: () => api.get('/meetings/'),
  get: (id) => api.get(`/meetings/${id}/`),
  create: (data) => api.post('/meetings/', data),
  update: (id, data) => api.patch(`/meetings/${id}/`, data),
  delete: (id) => api.delete(`/meetings/${id}/`),
  uploadTranscript: (id, formData) =>
    api.post(`/meetings/${id}/transcript/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

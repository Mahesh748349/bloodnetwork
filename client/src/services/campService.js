import { api } from './api.js';

export const campService = {
  getCamps: (params) => api.get('/camps', { params }).then((r) => r.data),
  getCampById: (id) => api.get(`/camps/${id}`).then((r) => r.data),
  createCamp: (data) => api.post('/camps', data).then((r) => r.data),
  registerForCamp: (id) => api.post(`/camps/${id}/register`).then((r) => r.data),
  unregisterFromCamp: (id) => api.delete(`/camps/${id}/register`).then((r) => r.data),
  updateCampStatus: (id, status) => api.patch(`/camps/${id}/status`, { status }).then((r) => r.data),
};


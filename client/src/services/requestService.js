import api from './api';

export const requestService = {
  createRequest: async (requestData) => {
    const response = await api.post('/requests', requestData);
    return response.data;
  },

  getRequests: async (filters = {}) => {
    const response = await api.get('/requests', { params: filters });
    return response.data;
  },

  getRequestById: async (id) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
  },

  updateRequestStatus: async (id, status, closureNotes = '') => {
    const response = await api.patch(`/requests/${id}/status`, { status, closureNotes });
    return response.data;
  },

  cancelRequest: async (id, reason) => {
    const response = await api.post(`/requests/${id}/cancel`, { reason });
    return response.data;
  },

  contactMatchedDonors: async (id, donorUserIds, message = '') => {
    const response = await api.post(`/requests/${id}/contact`, { donorUserIds, message });
    return response.data;
  },

  getMatchedDonorsForRequest: async (id, params = {}) => {
    const response = await api.get(`/requests/${id}/matched-donors`, { params });
    return response.data;
  },

  respondToRequest: async (id, responseStatus, donorNotes = '') => {
    const response = await api.post(`/requests/${id}/responses`, { responseStatus, donorNotes });
    return response.data;
  },

  getRequestResponses: async (id) => {
    const response = await api.get(`/requests/${id}/responses`);
    return response.data;
  },

  sosBroadcast: async (id) => {
    const response = await api.post(`/requests/${id}/sos-broadcast`);
    return response.data;
  },

  escalateRequest: async (id, reason = '') => {
    const response = await api.post(`/requests/${id}/escalate`, { reason });
    return response.data;
  },
};

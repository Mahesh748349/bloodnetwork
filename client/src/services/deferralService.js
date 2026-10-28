import api from './api';

export const deferralService = {
  getMyDeferralStatus: async () => {
    const response = await api.get('/donors/me/deferral');
    return response.data;
  },

  getDonorDeferralStatusForStaff: async (donorId) => {
    const response = await api.get(`/deferrals/donors/${donorId}/deferral-status`);
    return response.data;
  },

  createManualDeferral: async (donorId, data) => {
    const response = await api.post(`/deferrals/donors/${donorId}/deferrals`, data);
    return response.data;
  },

  reviewDeferral: async (deferralId, data) => {
    const response = await api.patch(`/deferrals/${deferralId}/review`, data);
    return response.data;
  },

  getDeferralRules: async () => {
    const response = await api.get('/deferrals/rules');
    return response.data;
  },

  createRule: async (ruleData) => {
    const response = await api.post('/deferrals/rules', ruleData);
    return response.data;
  },

  revalidateMatches: async (requestId, params = {}) => {
    const response = await api.post(`/requests/${requestId}/revalidate-matches`, null, { params });
    return response.data;
  },
};


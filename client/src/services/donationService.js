import api from './api';

export const donationService = {
  recordDonation: async (donationData) => {
    const response = await api.post('/donations', donationData);
    return response.data;
  },

  verifyDonation: async (id, data = {}) => {
    const response = await api.patch(`/donations/${id}/verify`, data);
    return response.data;
  },

  getDonationById: async (id) => {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  },

  getOrganizationDonations: async (filters = {}) => {
    const response = await api.get('/donations', { params: filters });
    return response.data;
  },

  getMyDonations: async () => {
    const response = await api.get('/donations/my');
    return response.data;
  },
};


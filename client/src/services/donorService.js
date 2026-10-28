import api from './api';

export const donorService = {
  getMyProfile: async () => {
    const response = await api.get('/donors/me');
    return response.data;
  },

  updateMyProfile: async (data) => {
    const response = await api.patch('/donors/me', data);
    return response.data;
  },

  updateAvailability: async (availabilityStatus) => {
    const response = await api.patch('/donors/availability', { availabilityStatus });
    return response.data;
  },

  getNearbyRequests: async (allBloodGroups = false) => {
    const response = await api.get(`/donors/requests?allBloodGroups=${allBloodGroups}`);
    return response.data;
  },

  getDonationHistory: async () => {
    const response = await api.get('/donors/history');
    return response.data;
  },

  searchNearbyDonors: async (params) => {
    const response = await api.get('/donors/nearby', { params });
    return response.data;
  },

  getMyDeferralStatus: async () => {
    const response = await api.get('/donors/me/deferral');
    return response.data;
  },

  getMyDonations: async () => {
    const response = await api.get('/donors/me/donations');
    return response.data;
  },
};

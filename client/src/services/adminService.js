import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getAllDonors: async (filters = {}) => {
    const response = await api.get('/admin/donors', { params: filters });
    return response.data;
  },

  verifyDonor: async (id, verificationStatus, medicalReviewNotes) => {
    const response = await api.patch(`/admin/donors/${id}/verify`, {
      verificationStatus,
      medicalReviewNotes,
    });
    return response.data;
  },

  getAuditLogs: async (page = 1, limit = 50) => {
    const response = await api.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
    return response.data;
  },

  reviewRequest: async (id, data) => {
    const response = await api.patch(`/admin/requests/${id}/review`, data);
    return response.data;
  },
};

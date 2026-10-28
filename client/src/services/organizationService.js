import api from './api';

export const organizationService = {
  createOrganization: async (orgData) => {
    const response = await api.post('/organizations', orgData);
    return response.data;
  },

  getMyOrganization: async () => {
    const response = await api.get('/organizations/me');
    return response.data;
  },

  updateMyOrganization: async (data) => {
    const response = await api.patch('/organizations/me', data);
    return response.data;
  },

  getOrganizationById: async (id) => {
    const response = await api.get(`/organizations/${id}`);
    return response.data;
  },

  getAllOrganizations: async (filters = {}) => {
    const response = await api.get('/admin/organizations', { params: filters });
    return response.data;
  },

  updateOrganizationStatus: async (id, status) => {
    const response = await api.patch(`/admin/organizations/${id}/status`, { status });
    return response.data;
  },
};


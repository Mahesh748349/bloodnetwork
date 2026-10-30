import { api } from './api.js';

export const analyticsService = {
  getNetworkStats: () => api.get('/analytics/network').then((r) => r.data),
  getOrgStats: (orgId) => api.get(`/analytics/org/${orgId}`).then((r) => r.data),
  getShortageAlerts: (threshold) =>
    api.get('/analytics/shortage-alerts', { params: { threshold } }).then((r) => r.data),
};


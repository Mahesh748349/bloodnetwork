import { api } from './api.js';

export const badgeService = {
  getMyBadges: () => api.get('/badges/me').then((r) => r.data),
  getLeaderboard: () => api.get('/badges/leaderboard').then((r) => r.data),
  getDonorBadges: (donorId) => api.get(`/badges/donor/${donorId}`).then((r) => r.data),
};


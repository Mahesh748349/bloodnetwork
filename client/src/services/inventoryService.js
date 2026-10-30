import { api } from './api.js';

export const inventoryService = {
  getInventory: (params) => api.get('/inventory', { params }).then((r) => r.data),
  addInventory: (data) => api.post('/inventory', data).then((r) => r.data),
  updateInventory: (id, data) => api.patch(`/inventory/${id}`, data).then((r) => r.data),
  getLowStock: (params) => api.get('/inventory/low-stock', { params }).then((r) => r.data),
  getNetworkSummary: () => api.get('/inventory/network-summary').then((r) => r.data),
  checkForRequest: (data) => api.post('/inventory/check-request', data).then((r) => r.data),
};


import { api } from './api.js';

export const questionnaireService = {
  submitQuestionnaire: (data) => api.post('/questionnaires', data).then((r) => r.data),
  getMyQuestionnaires: () => api.get('/questionnaires/me').then((r) => r.data),
  getQuestionnaireByRequest: (requestId) =>
    api.get(`/questionnaires/request/${requestId}`).then((r) => r.data),
  reviewQuestionnaire: (id, data) =>
    api.patch(`/questionnaires/${id}/review`, data).then((r) => r.data),
};


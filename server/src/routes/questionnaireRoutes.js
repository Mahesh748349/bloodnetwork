const express = require('express');
const router = express.Router();
const {
  submitQuestionnaire,
  getMyQuestionnaires,
  getQuestionnaireByRequest,
  reviewQuestionnaire,
} = require('../controllers/questionnaireController');
const { authenticate, authorize } = require('../middleware/auth');

const STAFF_ROLES = ['hospital_staff', 'hospital_admin', 'admin', 'platform_admin', 'requester'];

router.post('/', authenticate, authorize('donor'), submitQuestionnaire);
router.get('/me', authenticate, authorize('donor'), getMyQuestionnaires);
router.get('/request/:requestId', authenticate, authorize(...STAFF_ROLES), getQuestionnaireByRequest);
router.patch('/:id/review', authenticate, authorize(...STAFF_ROLES), reviewQuestionnaire);

module.exports = router;


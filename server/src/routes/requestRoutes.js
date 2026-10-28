const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  cancelRequest,
  contactMatchedDonors,
  getMatchedDonorsForRequest,
} = require('../controllers/requestController');
const {
  respondToRequest,
  getRequestResponses,
} = require('../controllers/responseController');
const { revalidateMatches } = require('../controllers/deferralController');
const { authenticate, authorize } = require('../middleware/auth');

const STAFF_ROLES = ['requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'];

// Blood requests
router.post('/', authenticate, authorize(...STAFF_ROLES), createRequest);
router.get('/', authenticate, getRequests);
router.get('/:id', authenticate, getRequestById);
router.patch('/:id/status', authenticate, authorize(...STAFF_ROLES), updateRequestStatus);
router.post('/:id/cancel', authenticate, authorize(...STAFF_ROLES), cancelRequest);

// Contact matched donors for a request
router.post('/:id/contact', authenticate, authorize(...STAFF_ROLES), contactMatchedDonors);
router.get('/:id/matched-donors', authenticate, authorize(...STAFF_ROLES), getMatchedDonorsForRequest);
router.post('/:id/revalidate-matches', authenticate, authorize(...STAFF_ROLES), revalidateMatches);

// Donor responses for a request
router.post('/:id/responses', authenticate, authorize('donor'), respondToRequest);
router.get('/:id/responses', authenticate, authorize(...STAFF_ROLES), getRequestResponses);

module.exports = router;

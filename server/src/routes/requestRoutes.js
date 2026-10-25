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
const { authenticate, authorize } = require('../middleware/auth');

// Blood requests
router.post('/', authenticate, authorize('requester', 'admin'), createRequest);
router.get('/', authenticate, getRequests);
router.get('/:id', authenticate, getRequestById);
router.patch('/:id/status', authenticate, authorize('requester', 'admin'), updateRequestStatus);
router.post('/:id/cancel', authenticate, authorize('requester', 'admin'), cancelRequest);

// Contact matched donors for a request
router.post('/:id/contact', authenticate, authorize('requester', 'admin'), contactMatchedDonors);
router.get('/:id/matched-donors', authenticate, authorize('requester', 'admin'), getMatchedDonorsForRequest);

// Donor responses for a request
router.post('/:id/responses', authenticate, authorize('donor'), respondToRequest);
router.get('/:id/responses', authenticate, authorize('requester', 'admin'), getRequestResponses);

module.exports = router;

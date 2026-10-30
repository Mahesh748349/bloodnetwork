const express = require('express');
const router = express.Router();
const BloodRequest = require('../models/BloodRequest');
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  cancelRequest,
  contactMatchedDonors,
  getMatchedDonorsForRequest,
  sosEmergencyBroadcast,
  escalateRequest,
} = require('../controllers/requestController');
const {
  respondToRequest,
  getRequestResponses,
} = require('../controllers/responseController');
const { revalidateMatches } = require('../controllers/deferralController');
const { authenticate, authorize } = require('../middleware/auth');

const STAFF_ROLES = ['requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'];

// Anonymous public emergency requests feed (No login required)
router.get('/public-feed', async (req, res, next) => {
  try {
    const { bloodGroup, urgency } = req.query;
    const query = {
      status: { $in: ['open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'] },
      requiredBy: { $gte: new Date() },
    };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (urgency) query.urgency = urgency;

    const requests = await BloodRequest.find(query)
      .select('bloodGroup unitsRequested urgency hospital.name hospital.address requiredBy status createdAt isSosBroadcast escalationLevel')
      .sort({ urgency: -1, createdAt: -1 })
      .limit(20);

    return res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
});

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

// SOS emergency broadcast & auto-escalation
router.post('/:id/sos-broadcast', authenticate, authorize(...STAFF_ROLES), sosEmergencyBroadcast);
router.post('/:id/escalate', authenticate, authorize(...STAFF_ROLES), escalateRequest);

// Donor responses for a request
router.post('/:id/responses', authenticate, authorize('donor'), respondToRequest);
router.get('/:id/responses', authenticate, authorize(...STAFF_ROLES), getRequestResponses);

module.exports = router;

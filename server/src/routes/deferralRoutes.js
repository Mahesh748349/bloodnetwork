const express = require('express');
const router = express.Router();
const {
  getMyDeferralStatus,
  getDonorDeferralStatusForStaff,
  createManualDeferral,
  reviewDeferral,
  getDeferralRules,
  createOrUpdateRule,
} = require('../controllers/deferralController');
const { authenticate, authorize } = require('../middleware/auth');

// Donor view their own deferral status
router.get('/me', authenticate, authorize('donor'), getMyDeferralStatus);

// Medical rules (viewable by authenticated users)
router.get('/rules', authenticate, getDeferralRules);
router.post(
  '/rules',
  authenticate,
  authorize('admin', 'platform_admin'),
  createOrUpdateRule
);

// Staff / Admin views donor deferral status
router.get(
  '/donors/:id/deferral-status',
  authenticate,
  authorize('requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'),
  getDonorDeferralStatusForStaff
);

// Clinical override / manual deferral creation
router.post(
  '/donors/:id/deferrals',
  authenticate,
  authorize('hospital_admin', 'admin', 'platform_admin'),
  createManualDeferral
);

// Medical review of a deferral record
router.patch(
  '/:id/review',
  authenticate,
  authorize('hospital_admin', 'admin', 'platform_admin'),
  reviewDeferral
);

module.exports = router;


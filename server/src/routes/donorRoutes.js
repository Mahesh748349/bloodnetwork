const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  getNearbyRequests,
  getDonationHistory,
  searchNearbyDonors,
} = require('../controllers/donorController');
const { getMyDeferralStatus } = require('../controllers/deferralController');
const { getMyDonations } = require('../controllers/donationController');
const { authenticate, authorize } = require('../middleware/auth');

const STAFF_ROLES = ['requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'];

// Protected for logged-in donors
router.get('/me', authenticate, authorize('donor'), getMyProfile);
router.patch('/me', authenticate, authorize('donor'), updateMyProfile);
router.patch('/availability', authenticate, authorize('donor'), updateAvailability);
router.get('/requests', authenticate, authorize('donor'), getNearbyRequests);
router.get('/history', authenticate, authorize('donor'), getDonationHistory);

// Centralized Deferral & Donation status for donors
router.get('/me/deferral', authenticate, authorize('donor'), getMyDeferralStatus);
router.get('/me/donations', authenticate, authorize('donor'), getMyDonations);

// Nearby donor discovery for requesters and hospital staff
router.get('/nearby', authenticate, authorize(...STAFF_ROLES), searchNearbyDonors);

module.exports = router;

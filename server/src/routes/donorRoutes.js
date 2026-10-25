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
const { authenticate, authorize } = require('../middleware/auth');

// Protected for logged-in donors
router.get('/me', authenticate, authorize('donor'), getMyProfile);
router.patch('/me', authenticate, authorize('donor'), updateMyProfile);
router.patch('/availability', authenticate, authorize('donor'), updateAvailability);
router.get('/requests', authenticate, authorize('donor'), getNearbyRequests);
router.get('/history', authenticate, authorize('donor'), getDonationHistory);

// Nearby donor discovery for requesters and admins
router.get('/nearby', authenticate, authorize('requester', 'admin'), searchNearbyDonors);

module.exports = router;

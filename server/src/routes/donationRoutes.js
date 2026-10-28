const express = require('express');
const router = express.Router();
const {
  recordDonation,
  verifyDonation,
  getDonationById,
  getOrganizationDonations,
  getMyDonations,
} = require('../controllers/donationController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected for hospital staff, requester, or admin
router.post(
  '/',
  authenticate,
  authorize('requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'),
  recordDonation
);

router.get(
  '/',
  authenticate,
  authorize('requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'),
  getOrganizationDonations
);

router.get(
  '/my',
  authenticate,
  authorize('donor'),
  getMyDonations
);

router.get(
  '/:id',
  authenticate,
  getDonationById
);

router.patch(
  '/:id/verify',
  authenticate,
  authorize('requester', 'hospital_staff', 'hospital_admin', 'admin', 'platform_admin'),
  verifyDonation
);

module.exports = router;


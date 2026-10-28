const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllDonors,
  verifyDonor,
  getAuditLogs,
  reviewRequest,
} = require('../controllers/adminController');
const {
  getAllOrganizations,
  updateOrganizationStatus,
} = require('../controllers/organizationController');
const {
  getDonorDeferralStatusForStaff,
  createManualDeferral,
  reviewDeferral,
  createOrUpdateRule,
} = require('../controllers/deferralController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are strictly protected for Admin / Platform Admin role
router.use(authenticate, authorize('admin', 'platform_admin'));

router.get('/dashboard', getDashboardStats);
router.get('/donors', getAllDonors);
router.patch('/donors/:id/verify', verifyDonor);
router.get('/audit-logs', getAuditLogs);
router.patch('/requests/:id/review', reviewRequest);

// Platform organization governance
router.get('/organizations', getAllOrganizations);
router.patch('/organizations/:id/status', updateOrganizationStatus);

// Platform deferral governance
router.get('/donors/:id/deferral-status', getDonorDeferralStatusForStaff);
router.post('/donors/:id/deferrals', createManualDeferral);
router.patch('/deferrals/:id/review', reviewDeferral);
router.post('/deferral-rules', createOrUpdateRule);

module.exports = router;

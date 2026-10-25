const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllDonors,
  verifyDonor,
  getAuditLogs,
  reviewRequest,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are strictly protected for Admin role
router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/donors', getAllDonors);
router.patch('/donors/:id/verify', verifyDonor);
router.get('/audit-logs', getAuditLogs);
router.patch('/requests/:id/review', reviewRequest);

module.exports = router;

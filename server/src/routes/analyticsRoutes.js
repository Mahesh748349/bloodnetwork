const express = require('express');
const router = express.Router();
const {
  getNetworkStats,
  getOrganizationStats,
  getBloodGroupShortageAlerts,
} = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/network', authenticate, authorize('admin', 'platform_admin', 'hospital_admin'), getNetworkStats);
router.get(
  '/shortage-alerts',
  authenticate,
  authorize('admin', 'platform_admin', 'hospital_admin', 'hospital_staff'),
  getBloodGroupShortageAlerts
);
router.get('/org/:orgId', authenticate, authorize('admin', 'platform_admin', 'hospital_admin'), getOrganizationStats);

module.exports = router;


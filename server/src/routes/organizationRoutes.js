const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getMyOrganization,
  updateMyOrganization,
  getOrganizationById,
} = require('../controllers/organizationController');
const { authenticate, authorize } = require('../middleware/auth');

router.post(
  '/',
  authenticate,
  authorize('requester', 'admin', 'platform_admin', 'hospital_admin'),
  createOrganization
);
router.get('/me', authenticate, getMyOrganization);
router.patch(
  '/me',
  authenticate,
  authorize('hospital_admin', 'admin', 'platform_admin'),
  updateMyOrganization
);
router.get('/:id', authenticate, getOrganizationById);

module.exports = router;


const express = require('express');
const router = express.Router();
const {
  addInventory,
  getOrganizationInventory,
  updateInventoryEntry,
  getLowStockAlerts,
  checkInventoryForRequest,
  getNetworkInventorySummary,
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

const STAFF_ROLES = ['hospital_staff', 'hospital_admin', 'admin', 'platform_admin', 'requester'];
const ADMIN_ROLES = ['admin', 'platform_admin', 'hospital_admin'];

router.post('/', authenticate, authorize(...STAFF_ROLES), addInventory);
router.get('/', authenticate, authorize(...STAFF_ROLES), getOrganizationInventory);
router.patch('/:id', authenticate, authorize(...ADMIN_ROLES), updateInventoryEntry);
router.get('/network-summary', authenticate, authorize('admin', 'platform_admin'), getNetworkInventorySummary);
router.get('/low-stock', authenticate, authorize(...STAFF_ROLES), getLowStockAlerts);
router.post('/check-request', authenticate, authorize(...STAFF_ROLES), checkInventoryForRequest);

module.exports = router;


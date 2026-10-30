const express = require('express');
const router = express.Router();
const {
  createCamp,
  getCamps,
  getCampById,
  registerForCamp,
  unregisterFromCamp,
  updateCampStatus,
} = require('../controllers/campController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('hospital_admin', 'admin', 'platform_admin'), createCamp);
router.get('/', authenticate, getCamps);
router.get('/:id', authenticate, getCampById);
router.post('/:id/register', authenticate, authorize('donor'), registerForCamp);
router.delete('/:id/register', authenticate, authorize('donor'), unregisterFromCamp);
router.patch('/:id/status', authenticate, authorize('hospital_admin', 'admin', 'platform_admin'), updateCampStatus);

module.exports = router;


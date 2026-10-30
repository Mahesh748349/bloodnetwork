const express = require('express');
const router = express.Router();
const { getMyBadges, getDonorBadges, getLeaderboard } = require('../controllers/badgeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me', authenticate, authorize('donor'), getMyBadges);
router.get('/leaderboard', authenticate, getLeaderboard);
router.get('/donor/:donorId', authenticate, getDonorBadges);

module.exports = router;


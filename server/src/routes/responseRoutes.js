const express = require('express');
const router = express.Router();
const { getMyResponses } = require('../controllers/responseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me', authenticate, authorize('donor'), getMyResponses);

module.exports = router;

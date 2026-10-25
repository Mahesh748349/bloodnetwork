const express = require('express');
const router = express.Router();
const { register, login, getMe, deactivateAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/deactivate', authenticate, deactivateAccount);

module.exports = router;

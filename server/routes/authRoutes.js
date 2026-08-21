const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Auth routes  ->  mounted at /api/auth in app.js
 *
 *   POST /api/auth/register   public   create an account
 *   POST /api/auth/login      public   log in, receive a JWT
 *   GET  /api/auth/me         private  current user's profile (needs token)
 */
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe); // `protect` runs first; blocks if no valid token

module.exports = router;

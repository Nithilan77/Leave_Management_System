const express = require('express');
const router = express.Router();
const {
  applyForLeave,
  getMyLeaveRequests,
  getMyBalances,
  cancelLeaveRequest,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Leave routes (Employee vertical)  ->  mounted at /api/leaves in app.js
 *
 * Every route requires a logged-in user (`protect`). These are employee-facing
 * actions; any authenticated user can manage THEIR OWN leave. Ownership checks
 * happen in the service (e.g. you can only cancel your own request).
 *
 *   POST  /api/leaves                 apply for leave
 *   GET   /api/leaves/me              my leave requests
 *   GET   /api/leaves/me/balances     my leave balances
 *   PATCH /api/leaves/:id/cancel      cancel my pending request
 */
router.post('/', protect, applyForLeave);
router.get('/me', protect, getMyLeaveRequests);
router.get('/me/balances', protect, getMyBalances);
router.patch('/:id/cancel', protect, cancelLeaveRequest);

module.exports = router;

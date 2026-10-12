const express = require('express');
const router = express.Router();
const {
  getTeamRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/managerController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Manager routes (Manager vertical)  ->  mounted at /api/manager in app.js
 *
 *   GET   /api/manager/team                   my team's requests (default: PENDING only)
 *   PATCH /api/manager/leaves/:id/approve     approve a pending request
 *   PATCH /api/manager/leaves/:id/reject      reject a pending request (comment required)
 */
router.use(protect, authorize('manager', 'hr'));

router.get('/team', getTeamRequests);
router.patch('/leaves/:id/approve', approveRequest);
router.patch('/leaves/:id/reject', rejectRequest);

module.exports = router;
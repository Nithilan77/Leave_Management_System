const express = require('express');
const router = express.Router();
const {
  getLeaveTypes,
  getLeaveType,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  allocateLeaveType,
  resetBalances,
} = require('../controllers/leaveTypeController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Leave type / policy routes (HR vertical)  ->  mounted at /api/leave-types
 *
 * Reading is open to any logged-in user (an employee can see what leave
 * types exist). Everything that changes policy is HR-only.
 *
 *   GET    /api/leave-types                    list types            (any role)
 *   GET    /api/leave-types/:id                one type              (any role)
 *   POST   /api/leave-types                    create type           (hr)
 *   PUT    /api/leave-types/:id                update type/quota     (hr)
 *   DELETE /api/leave-types/:id                delete unused type    (hr)
 *   POST   /api/leave-types/:id/allocate       give it to all users  (hr)
 *   POST   /api/leave-types/reset-balances     year-end reset        (hr)
 *
 * '/reset-balances' is declared before '/:id' routes so it isn't read as an id.
 */
router.use(protect);

router.post('/reset-balances', authorize('hr'), resetBalances);

router.route('/')
  .get(getLeaveTypes)
  .post(authorize('hr'), createLeaveType);

router.route('/:id')
  .get(getLeaveType)
  .put(authorize('hr'), updateLeaveType)
  .delete(authorize('hr'), deleteLeaveType);

router.post('/:id/allocate', authorize('hr'), allocateLeaveType);

module.exports = router;

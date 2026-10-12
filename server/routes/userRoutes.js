const express = require('express');
const router = express.Router();
const {
  getUsers,
  getManagers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  getUserBalances,
  setUserBalance,
  initializeUserBalances,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * User management routes (HR vertical)  ->  mounted at /api/users in app.js
 *
 * router.use(protect, authorize('hr')) applies to EVERY route below, so the
 * whole file is HR-only without repeating the middleware on each line.
 *
 *   GET    /api/users                                list users (?role=&department=&isActive=&search=)
 *   POST   /api/users                                create user (+ balances)
 *   GET    /api/users/managers                       managers/HR for dropdowns
 *   GET    /api/users/:id                            one user
 *   PUT    /api/users/:id                            edit name/email/role/department/manager
 *   PATCH  /api/users/:id/status                     activate / deactivate
 *   PATCH  /api/users/:id/password                   reset password
 *   GET    /api/users/:id/balances                   user's balances
 *   POST   /api/users/:id/balances/initialize        create missing balances
 *   PUT    /api/users/:id/balances/:leaveTypeId      set total days for one type
 *
 * Order matters: '/managers' must come BEFORE '/:id', otherwise Express
 * would treat the word "managers" as an id.
 */
router.use(protect, authorize('hr'));

router.route('/').get(getUsers).post(createUser);
router.get('/managers', getManagers);
router.route('/:id').get(getUser).put(updateUser);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/password', resetUserPassword);
router.get('/:id/balances', getUserBalances);
router.post('/:id/balances/initialize', initializeUserBalances);
router.put('/:id/balances/:leaveTypeId', setUserBalance);

module.exports = router;

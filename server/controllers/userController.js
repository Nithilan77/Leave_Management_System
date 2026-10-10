const handle = require('../utils/serviceHandler');
const userService = require('../services/userService');
const balanceService = require('../services/balanceService');

/**
 * User controllers (HR vertical)
 * -------------------------------
 * Thin handlers, same pattern as leaveController: read the request, call the
 * service, send the response. `handle` (utils/serviceHandler) applies the
 * service error's statusCode before the central errorHandler runs.
 *
 * Every route using these is protected with protect + authorize('hr').
 */

/**
 * @desc    List users (filters: role, department, isActive, search)
 * @route   GET /api/users
 * @access  Private (hr)
 */
const getUsers = handle(async (req, res) => {
  const users = await userService.listUsers(req.query);
  res.status(200).json({ success: true, count: users.length, users });
});

/**
 * @desc    Active managers + HR (for the "assign manager" dropdown)
 * @route   GET /api/users/managers
 * @access  Private (hr)
 */
const getManagers = handle(async (req, res) => {
  const managers = await userService.listManagers();
  res.status(200).json({ success: true, managers });
});

/**
 * @desc    Get one user
 * @route   GET /api/users/:id
 * @access  Private (hr)
 */
const getUser = handle(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({ success: true, user });
});

/**
 * @desc    Create a user (balances are set up automatically)
 * @route   POST /api/users
 * @access  Private (hr)
 */
const createUser = handle(async (req, res) => {
  const { user, balancesCreated } = await userService.createUser(req.body);
  res.status(201).json({ success: true, user, balancesCreated });
});

/**
 * @desc    Update a user's name, email, role, department or manager
 * @route   PUT /api/users/:id
 * @access  Private (hr)
 */
const updateUser = handle(async (req, res) => {
  const user = await userService.updateUser(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, user });
});

/**
 * @desc    Activate / deactivate a user   body: { isActive: true|false }
 * @route   PATCH /api/users/:id/status
 * @access  Private (hr)
 */
const updateUserStatus = handle(async (req, res) => {
  const user = await userService.setUserStatus(req.user._id, req.params.id, req.body.isActive);
  res.status(200).json({ success: true, user });
});

/**
 * @desc    Reset a user's password   body: { password }
 * @route   PATCH /api/users/:id/password
 * @access  Private (hr)
 */
const resetUserPassword = handle(async (req, res) => {
  await userService.resetPassword(req.params.id, req.body.password);
  res.status(200).json({ success: true, message: 'Password updated' });
});

/**
 * @desc    Get a user's leave balances
 * @route   GET /api/users/:id/balances
 * @access  Private (hr)
 */
const getUserBalances = handle(async (req, res) => {
  const balances = await balanceService.getUserBalances(req.params.id);
  res.status(200).json({ success: true, balances });
});

/**
 * @desc    Set a user's total days for one leave type   body: { total }
 * @route   PUT /api/users/:id/balances/:leaveTypeId
 * @access  Private (hr)
 */
const setUserBalance = handle(async (req, res) => {
  const balance = await balanceService.setUserBalance(
    req.params.id, req.params.leaveTypeId, req.body.total
  );
  res.status(200).json({ success: true, balance });
});

/**
 * @desc    Create any missing balances for a user (one per leave type)
 * @route   POST /api/users/:id/balances/initialize
 * @access  Private (hr)
 */
const initializeUserBalances = handle(async (req, res) => {
  const { created } = await balanceService.initializeBalancesForUser(req.params.id);
  res.status(200).json({ success: true, created });
});

module.exports = {
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
};

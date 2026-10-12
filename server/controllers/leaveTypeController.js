const handle = require('../utils/serviceHandler');
const leaveTypeService = require('../services/leaveTypeService');
const balanceService = require('../services/balanceService');

/**
 * Leave type controllers (HR vertical)
 * -------------------------------------
 * HR manages leave policy: the leave types and their yearly quotas.
 * Reading the list is open to any logged-in user; changes are HR-only
 * (enforced in leaveTypeRoutes.js).
 */

/**
 * @desc    List all leave types
 * @route   GET /api/leave-types
 * @access  Private (any logged-in user)
 */
const getLeaveTypes = handle(async (req, res) => {
  const leaveTypes = await leaveTypeService.listLeaveTypes();
  res.status(200).json({ success: true, count: leaveTypes.length, leaveTypes });
});

/**
 * @desc    Get one leave type
 * @route   GET /api/leave-types/:id
 * @access  Private (any logged-in user)
 */
const getLeaveType = handle(async (req, res) => {
  const leaveType = await leaveTypeService.getLeaveTypeById(req.params.id);
  res.status(200).json({ success: true, leaveType });
});

/**
 * @desc    Create a leave type
 *          body: { name, annualQuota, description?, allocateToAll? (default true) }
 * @route   POST /api/leave-types
 * @access  Private (hr)
 */
const createLeaveType = handle(async (req, res) => {
  const result = await leaveTypeService.createLeaveType(req.body);
  res.status(201).json({ success: true, ...result });
});

/**
 * @desc    Update a leave type
 *          body: { name?, annualQuota?, description?, applyToBalances? (default false) }
 * @route   PUT /api/leave-types/:id
 * @access  Private (hr)
 */
const updateLeaveType = handle(async (req, res) => {
  const result = await leaveTypeService.updateLeaveType(req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
});

/**
 * @desc    Delete an unused leave type
 * @route   DELETE /api/leave-types/:id
 * @access  Private (hr)
 */
const deleteLeaveType = handle(async (req, res) => {
  const result = await leaveTypeService.deleteLeaveType(req.params.id);
  res.status(200).json({ success: true, ...result });
});

/**
 * @desc    Give every active user a balance for this type (if missing)
 * @route   POST /api/leave-types/:id/allocate
 * @access  Private (hr)
 */
const allocateLeaveType = handle(async (req, res) => {
  const { created } = await balanceService.allocateTypeToAllUsers(req.params.id);
  res.status(200).json({ success: true, created });
});

/**
 * @desc    Year-end reset: all balances back to annual quota, used = 0
 * @route   POST /api/leave-types/reset-balances
 * @access  Private (hr)
 */
const resetBalances = handle(async (req, res) => {
  const { modified } = await balanceService.resetAllBalances();
  res.status(200).json({ success: true, modified });
});

module.exports = {
  getLeaveTypes,
  getLeaveType,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  allocateLeaveType,
  resetBalances,
};

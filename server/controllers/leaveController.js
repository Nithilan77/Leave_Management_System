const asyncHandler = require('../utils/asyncHandler');
const leaveService = require('../services/leaveService');

/**
 * Leave controllers (Employee vertical)
 * --------------------------------------
 * Thin handlers: read the request, call the service, send the response.
 * All business logic lives in leaveService. Errors thrown by the service carry
 * a statusCode, which we apply before re-throwing to the central error handler.
 */

// Small helper: apply a service error's statusCode to the response.
const applyStatus = (res, err) => {
  if (err.statusCode) res.status(err.statusCode);
};

/**
 * @desc    Apply for leave
 * @route   POST /api/leaves
 * @access  Private (employee)
 */
const applyForLeave = asyncHandler(async (req, res) => {
  const { leaveTypeId, startDate, endDate, reason } = req.body;

  if (!leaveTypeId || !startDate || !endDate || !reason) {
    res.status(400);
    throw new Error('leaveTypeId, startDate, endDate, and reason are all required');
  }

  try {
    const request = await leaveService.applyForLeave(req.user._id, {
      leaveTypeId, startDate, endDate, reason,
    });
    res.status(201).json({ success: true, request });
  } catch (err) {
    applyStatus(res, err);
    throw err;
  }
});

/**
 * @desc    Get my leave requests
 * @route   GET /api/leaves/me
 * @access  Private (employee)
 */
const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await leaveService.getMyLeaveRequests(req.user._id);
  res.status(200).json({ success: true, count: requests.length, requests });
});

/**
 * @desc    Get my leave balances
 * @route   GET /api/leaves/me/balances
 * @access  Private (employee)
 */
const getMyBalances = asyncHandler(async (req, res) => {
  const balances = await leaveService.getMyBalances(req.user._id);
  res.status(200).json({ success: true, balances });
});

/**
 * @desc    Cancel my pending leave request
 * @route   PATCH /api/leaves/:id/cancel
 * @access  Private (employee)
 */
const cancelLeaveRequest = asyncHandler(async (req, res) => {
  try {
    const request = await leaveService.cancelLeaveRequest(req.user._id, req.params.id);
    res.status(200).json({ success: true, request });
  } catch (err) {
    applyStatus(res, err);
    throw err;
  }
});

module.exports = {
  applyForLeave,
  getMyLeaveRequests,
  getMyBalances,
  cancelLeaveRequest,
};

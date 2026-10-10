const asyncHandler = require('../utils/asyncHandler');
const leaveService = require('../services/leaveService');

/**
 * Manager controllers (Manager vertical)
 * ----------------------------------------
 * Thin handlers over the SAME leaveService functions the Employee vertical
 * uses for approve/reject — no duplicated business logic. These routes are
 * restricted to 'manager' and 'hr' (see managerRoutes.js); the team-ownership
 * check (a manager can only act on their own team) lives in the service.
 */

const applyStatus = (res, err) => {
  if (err.statusCode) res.status(err.statusCode);
};

/**
 * @desc    Get my team's leave requests
 * @route   GET /api/manager/team?status=PENDING
 * @access  Private (manager, hr)
 * @query   status - optional. Defaults to PENDING (the actionable queue).
 *                   Pass status=ALL to see full team history.
 */
const getTeamRequests = asyncHandler(async (req, res) => {
  const status = req.query.status === 'ALL' ? null : (req.query.status || 'PENDING');
  const requests = await leaveService.getTeamRequests(req.user._id, status);
  res.status(200).json({ success: true, count: requests.length, requests });
});

/**
 * @desc    Approve a pending leave request
 * @route   PATCH /api/manager/leaves/:id/approve
 * @access  Private (manager, hr)
 */
const approveRequest = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  try {
    const request = await leaveService.approveLeaveRequest(req.user, req.params.id, comment);
    res.status(200).json({ success: true, request });
  } catch (err) {
    applyStatus(res, err);
    throw err;
  }
});

/**
 * @desc    Reject a pending leave request
 * @route   PATCH /api/manager/leaves/:id/reject
 * @access  Private (manager, hr)
 */
const rejectRequest = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  if (!comment || !comment.trim()) {
    res.status(400);
    throw new Error('A comment is required when rejecting a request');
  }
  try {
    const request = await leaveService.rejectLeaveRequest(req.user, req.params.id, comment);
    res.status(200).json({ success: true, request });
  } catch (err) {
    applyStatus(res, err);
    throw err;
  }
});

module.exports = { getTeamRequests, approveRequest, rejectRequest };
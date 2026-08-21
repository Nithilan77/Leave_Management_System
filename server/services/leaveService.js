const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const AuditLog = require('../models/AuditLog');
const calculateLeaveDays = require('../utils/calculateLeaveDays');

/**
 * leaveService
 * -------------
 * All the BUSINESS LOGIC for leave lives here, separated from the controllers
 * (which only handle request/response). This is the "service layer" in our
 * routes -> controllers -> services -> models architecture.
 *
 * Keeping logic here means:
 *   - controllers stay thin and readable
 *   - the same logic can be reused (e.g. Muskan's approval flow calls
 *     approveLeaveRequest() here instead of duplicating deduction logic)
 *   - it's easy to unit-test in isolation
 */

/**
 * Compute how many days of a leave type an employee has effectively available,
 * accounting for days already committed to PENDING requests of the same type.
 *
 * available = balance.remaining - (sum of days in pending requests of this type)
 *
 * This closes the loophole where an employee submits several overlapping
 * pending requests that each individually "fit" but together exceed the balance.
 */
const getAvailableDays = async (userId, leaveTypeId) => {
  const balance = await LeaveBalance.findOne({ user: userId, leaveType: leaveTypeId });
  if (!balance) return { balance: null, available: 0 };

  const pending = await LeaveRequest.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(userId),
        leaveType: new mongoose.Types.ObjectId(leaveTypeId),
        status: 'PENDING',
      },
    },
    { $group: { _id: null, totalPendingDays: { $sum: '$days' } } },
  ]);

  const pendingDays = pending.length ? pending[0].totalPendingDays : 0;
  const remaining = balance.total - balance.used;
  return { balance, available: remaining - pendingDays };
};

/**
 * Apply for leave.
 * Validates the leave type exists, computes the day count, checks the employee
 * has enough available balance (counting pending requests), creates the request
 * as PENDING, and writes a CREATED audit log entry.
 */
const applyForLeave = async (userId, { leaveTypeId, startDate, endDate, reason }) => {
  // 1. Leave type must exist
  const leaveType = await LeaveType.findById(leaveTypeId);
  if (!leaveType) {
    const err = new Error('Invalid leave type');
    err.statusCode = 400;
    throw err;
  }

  // 2. Compute number of days requested
  const days = calculateLeaveDays(startDate, endDate);
  if (days < 1) {
    const err = new Error('Leave must be at least 1 day');
    err.statusCode = 400;
    throw err;
  }

  // 3. Check available balance (remaining minus already-pending days)
  const { balance, available } = await getAvailableDays(userId, leaveTypeId);
  if (!balance) {
    const err = new Error('No leave balance set for this leave type. Contact HR.');
    err.statusCode = 400;
    throw err;
  }
  if (days > available) {
    const err = new Error(
      `Insufficient balance: you requested ${days} day(s) but only ${available} available ` +
      `(after accounting for pending requests).`
    );
    err.statusCode = 400;
    throw err;
  }

  // 4. Create the request
  const request = await LeaveRequest.create({
    employee: userId,
    leaveType: leaveTypeId,
    startDate,
    endDate,
    days,
    reason,
    status: 'PENDING',
  });

  // 5. Audit trail
  await AuditLog.create({
    request: request._id,
    action: 'CREATED',
    performedBy: userId,
    details: `Applied for ${days} day(s) of ${leaveType.name}`,
  });

  return request;
};

/**
 * Get all leave requests for a specific employee, newest first.
 * Populates leaveType name so the frontend can display it.
 */
const getMyLeaveRequests = async (userId) => {
  return LeaveRequest.find({ employee: userId })
    .populate('leaveType', 'name')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 });
};

/**
 * Get an employee's balances across all leave types.
 */
const getMyBalances = async (userId) => {
  return LeaveBalance.find({ user: userId }).populate('leaveType', 'name annualQuota');
};

/**
 * Cancel a PENDING request. Only the owner can cancel, and only while it's
 * still pending (you can't cancel something already approved/rejected).
 */
const cancelLeaveRequest = async (userId, requestId) => {
  const request = await LeaveRequest.findById(requestId);

  if (!request) {
    const err = new Error('Leave request not found');
    err.statusCode = 404;
    throw err;
  }

  // Ownership check: an employee can only cancel their OWN request.
  if (String(request.employee) !== String(userId)) {
    const err = new Error('You can only cancel your own requests');
    err.statusCode = 403;
    throw err;
  }

  if (request.status !== 'PENDING') {
    const err = new Error(`Cannot cancel a request that is already ${request.status}`);
    err.statusCode = 400;
    throw err;
  }

  request.status = 'CANCELLED';
  await request.save();

  await AuditLog.create({
    request: request._id,
    action: 'CANCELLED',
    performedBy: userId,
    details: 'Cancelled by employee before review',
  });

  return request;
};

/**
 * Approve a leave request (SHARED with the Manager vertical).
 * Deducts the days from the employee's balance and logs it.
 * Muskan's approval controller will call THIS so the deduction logic isn't
 * duplicated. Placed here because it belongs to the leave domain.
 *
 * @param reviewerId - the manager/HR user approving
 */
const approveLeaveRequest = async (reviewerId, requestId, comment = '') => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error('Leave request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'PENDING') {
    const err = new Error(`Only PENDING requests can be approved (this is ${request.status})`);
    err.statusCode = 400;
    throw err;
  }

  // Deduct from balance
  const balance = await LeaveBalance.findOne({
    user: request.employee,
    leaveType: request.leaveType,
  });
  if (!balance || balance.total - balance.used < request.days) {
    const err = new Error('Employee no longer has sufficient balance to approve');
    err.statusCode = 400;
    throw err;
  }
  balance.used += request.days;
  await balance.save();

  request.status = 'APPROVED';
  request.reviewedBy = reviewerId;
  request.reviewComment = comment;
  await request.save();

  await AuditLog.create({
    request: request._id,
    action: 'APPROVED',
    performedBy: reviewerId,
    details: comment || `Approved ${request.days} day(s)`,
  });

  return request;
};

/**
 * Reject a leave request (SHARED with the Manager vertical).
 * No balance change (nothing was deducted while pending). Logs the rejection.
 */
const rejectLeaveRequest = async (reviewerId, requestId, comment = '') => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error('Leave request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'PENDING') {
    const err = new Error(`Only PENDING requests can be rejected (this is ${request.status})`);
    err.statusCode = 400;
    throw err;
  }

  request.status = 'REJECTED';
  request.reviewedBy = reviewerId;
  request.reviewComment = comment;
  await request.save();

  await AuditLog.create({
    request: request._id,
    action: 'REJECTED',
    performedBy: reviewerId,
    details: comment || 'Rejected',
  });

  return request;
};

module.exports = {
  getAvailableDays,
  applyForLeave,
  getMyLeaveRequests,
  getMyBalances,
  cancelLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
};

const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { createError, assertValidId } = require('../utils/createError');

/**
 * reportService  (HR vertical)
 * -----------------------------
 * Read-only reporting over the whole organisation. Nothing here changes data.
 *
 * Most reports use MongoDB aggregation pipelines ($match -> $group -> $lookup)
 * so the counting happens inside the database rather than loading every
 * request into Node and looping.
 *
 * "Days taken" always means days in APPROVED requests — pending, rejected
 * and cancelled requests didn't use any leave.
 */

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'];
const AUDIT_ACTIONS = ['CREATED', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'];

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const parseDate = (value, label) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw createError(`Invalid ${label} date`, 400);
  return d;
};

/**
 * Organisation-wide headline numbers for the HR dashboard.
 */
const getSummary = async () => {
  const [statusCounts, approvedDays, usersByRole, activeUsers] = await Promise.all([
    LeaveRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    LeaveRequest.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, days: { $sum: '$days' } } },
    ]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
  ]);

  // Turn [{_id:'PENDING',count:3}, ...] into { PENDING: 3, APPROVED: 0, ... }
  const requestsByStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  statusCounts.forEach((s) => { requestsByStatus[s._id] = s.count; });

  const roles = { employee: 0, manager: 0, hr: 0 };
  usersByRole.forEach((r) => { roles[r._id] = r.count; });

  const totalRequests = Object.values(requestsByStatus).reduce((a, b) => a + b, 0);

  return {
    totalRequests,
    requestsByStatus,
    approvedDays: approvedDays.length ? approvedDays[0].days : 0,
    users: { ...roles, total: roles.employee + roles.manager + roles.hr, active: activeUsers },
  };
};

/**
 * Per leave type: how many requests in each status and how many days approved.
 * Leave types with no requests still appear (with zeros).
 */
const getByLeaveType = async () => {
  return LeaveType.aggregate([
    {
      $lookup: {
        from: LeaveRequest.collection.name,
        localField: '_id',
        foreignField: 'leaveType',
        as: 'requests',
      },
    },
    {
      $project: {
        name: 1,
        annualQuota: 1,
        totalRequests: { $size: '$requests' },
        approved: {
          $size: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'APPROVED'] } } },
        },
        pending: {
          $size: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'PENDING'] } } },
        },
        rejected: {
          $size: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'REJECTED'] } } },
        },
        approvedDays: {
          $sum: {
            $map: {
              input: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'APPROVED'] } } },
              in: '$$this.days',
            },
          },
        },
      },
    },
    { $sort: { name: 1 } },
  ]);
};

/**
 * Per department: number of requests and approved days.
 * Department comes from the employee who applied ($lookup into users).
 */
const getByDepartment = async () => {
  return LeaveRequest.aggregate([
    {
      $lookup: {
        from: User.collection.name,
        localField: 'employee',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: '$emp' },
    {
      $group: {
        _id: { $ifNull: ['$emp.department', 'Unassigned'] },
        totalRequests: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        approvedDays: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$days', 0] } },
        employees: { $addToSet: '$employee' },
      },
    },
    {
      $project: {
        _id: 0,
        department: '$_id',
        totalRequests: 1,
        approved: 1,
        pending: 1,
        approvedDays: 1,
        employeesOnLeave: { $size: '$employees' },
      },
    },
    { $sort: { approvedDays: -1 } },
  ]);
};

/**
 * Approved leave days per month for one year (by start date).
 * Always returns 12 entries so the frontend chart has no gaps.
 */
const getMonthlyTrend = async (year) => {
  const y = year ? Number(year) : new Date().getFullYear();
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw createError('Invalid year', 400);

  const rows = await LeaveRequest.aggregate([
    {
      $match: {
        status: 'APPROVED',
        startDate: { $gte: new Date(Date.UTC(y, 0, 1)), $lt: new Date(Date.UTC(y + 1, 0, 1)) },
      },
    },
    {
      $group: {
        _id: { $month: '$startDate' }, // 1..12
        days: { $sum: '$days' },
        requests: { $sum: 1 },
      },
    },
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = MONTHS.map((label, i) => ({ month: i + 1, label, days: 0, requests: 0 }));
  rows.forEach((r) => {
    months[r._id - 1].days = r.days;
    months[r._id - 1].requests = r.requests;
  });

  return { year: y, months };
};

/**
 * Build a Mongo filter for the "all leave requests" report from query params.
 *   status, leaveType, employee, department, from, to
 * from/to select requests whose date range OVERLAPS [from, to].
 */
const buildRequestFilter = async ({ status, leaveType, employee, department, from, to } = {}) => {
  const filter = {};

  if (status) {
    if (!STATUSES.includes(status)) throw createError('Invalid status filter', 400);
    filter.status = status;
  }
  if (leaveType) {
    assertValidId(leaveType, 'leave type id');
    filter.leaveType = leaveType;
  }
  if (employee) {
    assertValidId(employee, 'employee id');
    filter.employee = employee;
  }
  if (department) {
    const ids = await User.find({ department }).distinct('_id');
    // Combine with an employee filter if both were given.
    filter.employee = filter.employee
      ? { $in: ids.filter((id) => String(id) === String(filter.employee)) }
      : { $in: ids };
  }
  if (from) filter.endDate = { $gte: parseDate(from, 'from') };
  if (to) filter.startDate = { $lte: parseDate(to, 'to') };

  return filter;
};

/**
 * Every leave request in the organisation (with filters), newest first.
 */
const getAllRequests = async (query = {}) => {
  const filter = await buildRequestFilter(query);
  return LeaveRequest.find(filter)
    .populate('employee', 'name email department')
    .populate('leaveType', 'name')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 });
};

/**
 * Same data as getAllRequests, formatted as CSV text for download/Excel.
 */
const exportRequestsCsv = async (query = {}) => {
  const requests = await getAllRequests(query);

  // Wrap every value in quotes and double any quotes inside it (CSV rules).
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

  const header = [
    'Employee', 'Email', 'Department', 'Leave Type', 'Start Date', 'End Date',
    'Days', 'Status', 'Reason', 'Reviewed By', 'Review Comment', 'Applied On',
  ];

  const lines = requests.map((r) => [
    r.employee?.name, r.employee?.email, r.employee?.department, r.leaveType?.name,
    day(r.startDate), day(r.endDate), r.days, r.status, r.reason,
    r.reviewedBy?.name, r.reviewComment, day(r.createdAt),
  ].map(cell).join(','));

  return [header.map(cell).join(','), ...lines].join('\r\n');
};

/**
 * The audit trail (written by the employee & manager flows), newest first,
 * paginated. HR reads it here; nobody can edit it.
 */
const getAuditLogs = async ({ action, performedBy, page = 1, limit = 25 } = {}) => {
  const filter = {};
  if (action) {
    if (!AUDIT_ACTIONS.includes(action)) throw createError('Invalid action filter', 400);
    filter.action = action;
  }
  if (performedBy) {
    assertValidId(performedBy, 'user id');
    filter.performedBy = toObjectId(performedBy);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('performedBy', 'name role')
      .populate({
        path: 'request',
        select: 'employee leaveType startDate endDate days status',
        populate: [
          { path: 'employee', select: 'name' },
          { path: 'leaveType', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page: pageNum, pages: Math.ceil(total / perPage) || 1 };
};

module.exports = {
  getSummary,
  getByLeaveType,
  getByDepartment,
  getMonthlyTrend,
  getAllRequests,
  exportRequestsCsv,
  getAuditLogs,
};

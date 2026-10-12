const handle = require('../utils/serviceHandler');
const reportService = require('../services/reportService');

/**
 * Report controllers (HR vertical)
 * ---------------------------------
 * Read-only, organisation-wide reports. All routes are HR-only.
 */

/**
 * @desc    Headline numbers: requests by status, approved days, user counts
 * @route   GET /api/reports/summary
 * @access  Private (hr)
 */
const getSummary = handle(async (req, res) => {
  const summary = await reportService.getSummary();
  res.status(200).json({ success: true, summary });
});

/**
 * @desc    Requests and approved days per leave type
 * @route   GET /api/reports/by-leave-type
 * @access  Private (hr)
 */
const getByLeaveType = handle(async (req, res) => {
  const rows = await reportService.getByLeaveType();
  res.status(200).json({ success: true, rows });
});

/**
 * @desc    Requests and approved days per department
 * @route   GET /api/reports/by-department
 * @access  Private (hr)
 */
const getByDepartment = handle(async (req, res) => {
  const rows = await reportService.getByDepartment();
  res.status(200).json({ success: true, rows });
});

/**
 * @desc    Approved days per month   query: ?year=2026
 * @route   GET /api/reports/monthly
 * @access  Private (hr)
 */
const getMonthlyTrend = handle(async (req, res) => {
  const trend = await reportService.getMonthlyTrend(req.query.year);
  res.status(200).json({ success: true, ...trend });
});

/**
 * @desc    All leave requests in the organisation
 *          query: status, leaveType, employee, department, from, to
 * @route   GET /api/reports/requests
 * @access  Private (hr)
 */
const getAllRequests = handle(async (req, res) => {
  const requests = await reportService.getAllRequests(req.query);
  res.status(200).json({ success: true, count: requests.length, requests });
});

/**
 * @desc    Same as /requests, downloaded as a CSV file
 * @route   GET /api/reports/requests/export
 * @access  Private (hr)
 */
const exportRequests = handle(async (req, res) => {
  const csv = await reportService.exportRequestsCsv(req.query);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leave-requests-${stamp}.csv"`);
  res.status(200).send(csv);
});

/**
 * @desc    Audit trail   query: action, performedBy, page, limit
 * @route   GET /api/reports/audit-logs
 * @access  Private (hr)
 */
const getAuditLogs = handle(async (req, res) => {
  const result = await reportService.getAuditLogs(req.query);
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  getSummary,
  getByLeaveType,
  getByDepartment,
  getMonthlyTrend,
  getAllRequests,
  exportRequests,
  getAuditLogs,
};

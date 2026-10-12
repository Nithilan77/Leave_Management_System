const express = require('express');
const router = express.Router();
const {
  getSummary,
  getByLeaveType,
  getByDepartment,
  getMonthlyTrend,
  getAllRequests,
  exportRequests,
  getAuditLogs,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Report routes (HR vertical)  ->  mounted at /api/reports in app.js
 * All HR-only and read-only.
 *
 *   GET /api/reports/summary            headline numbers
 *   GET /api/reports/by-leave-type      per leave type
 *   GET /api/reports/by-department      per department
 *   GET /api/reports/monthly?year=      approved days per month
 *   GET /api/reports/requests           all requests (?status=&leaveType=&employee=&department=&from=&to=)
 *   GET /api/reports/requests/export    same, as CSV
 *   GET /api/reports/audit-logs         audit trail (?action=&performedBy=&page=&limit=)
 */
router.use(protect, authorize('hr'));

router.get('/summary', getSummary);
router.get('/by-leave-type', getByLeaveType);
router.get('/by-department', getByDepartment);
router.get('/monthly', getMonthlyTrend);
router.get('/requests', getAllRequests);
router.get('/requests/export', exportRequests);
router.get('/audit-logs', getAuditLogs);

module.exports = router;

jest.mock('../models/LeaveRequest');
jest.mock('../models/LeaveType');
jest.mock('../models/User');
jest.mock('../models/AuditLog');

const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const reportService = require('../services/reportService');

const EMP_ID = '507f1f77bcf86cd799439012';
const LT_ID = '507f1f77bcf86cd799439014';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reportService.getSummary', () => {
  test('fills in zero counts for statuses with no requests, and totals correctly', async () => {
    LeaveRequest.aggregate
      .mockResolvedValueOnce([{ _id: 'PENDING', count: 3 }, { _id: 'APPROVED', count: 5 }])
      .mockResolvedValueOnce([{ _id: null, days: 22 }]);
    User.aggregate.mockResolvedValue([{ _id: 'employee', count: 8 }, { _id: 'manager', count: 2 }]);
    User.countDocuments.mockResolvedValue(9);

    const result = await reportService.getSummary();

    expect(result.requestsByStatus).toEqual({
      PENDING: 3, APPROVED: 5, REJECTED: 0, CANCELLED: 0, ESCALATED: 0,
    });
    expect(result.totalRequests).toBe(8);
    expect(result.approvedDays).toBe(22);
    expect(result.users).toEqual({ employee: 8, manager: 2, hr: 0, total: 10, active: 9 });
  });

  test('handles the empty-database case (no requests, no approved days) without crashing', async () => {
    LeaveRequest.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    User.aggregate.mockResolvedValue([]);
    User.countDocuments.mockResolvedValue(0);

    const result = await reportService.getSummary();

    expect(result.totalRequests).toBe(0);
    expect(result.approvedDays).toBe(0);
    expect(result.users.total).toBe(0);
  });
});

describe('reportService.getMonthlyTrend', () => {
  test('always returns 12 months, zero-filled for months with no approved leave', async () => {
    LeaveRequest.aggregate.mockResolvedValue([
      { _id: 3, days: 10, requests: 2 }, // March
      { _id: 11, days: 5, requests: 1 }, // November
    ]);

    const result = await reportService.getMonthlyTrend(2026);

    expect(result.year).toBe(2026);
    expect(result.months).toHaveLength(12);
    expect(result.months[2]).toEqual({ month: 3, label: 'Mar', days: 10, requests: 2 });
    expect(result.months[10]).toEqual({ month: 11, label: 'Nov', days: 5, requests: 1 });
    expect(result.months[0]).toEqual({ month: 1, label: 'Jan', days: 0, requests: 0 });
  });

  test('defaults to the current year if none is given', async () => {
    LeaveRequest.aggregate.mockResolvedValue([]);
    const result = await reportService.getMonthlyTrend();
    expect(result.year).toBe(new Date().getFullYear());
  });

  test('400s on an invalid year', async () => {
    await expect(reportService.getMonthlyTrend(99999)).rejects.toMatchObject({ statusCode: 400 });
    await expect(reportService.getMonthlyTrend('not-a-year')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('reportService.getAllRequests (filter building)', () => {
  const chain = () => {
    const q = {};
    q.populate = jest.fn().mockReturnValue(q);
    q.sort = jest.fn().mockResolvedValue([{ _id: 'req1' }]);
    return q;
  };

  test('400s on an invalid status filter', async () => {
    await expect(reportService.getAllRequests({ status: 'NOT_A_STATUS' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('400s on a malformed leaveType or employee id', async () => {
    await expect(reportService.getAllRequests({ leaveType: 'bad-id' }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(reportService.getAllRequests({ employee: 'bad-id' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('builds a combined filter for status + leaveType + date range and queries LeaveRequest', async () => {
    LeaveRequest.find.mockReturnValue(chain());

    await reportService.getAllRequests({
      status: 'APPROVED', leaveType: LT_ID, from: '2026-01-01', to: '2026-12-31',
    });

    expect(LeaveRequest.find).toHaveBeenCalledWith(expect.objectContaining({
      status: 'APPROVED',
      leaveType: LT_ID,
      endDate: { $gte: new Date('2026-01-01') },
      startDate: { $lte: new Date('2026-12-31') },
    }));
  });

  test('department filter resolves to a set of employee ids via User.find(...).distinct', async () => {
    User.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue([EMP_ID]) });
    LeaveRequest.find.mockReturnValue(chain());

    await reportService.getAllRequests({ department: 'Engineering' });

    expect(User.find).toHaveBeenCalledWith({ department: 'Engineering' });
    expect(LeaveRequest.find).toHaveBeenCalledWith(expect.objectContaining({
      employee: { $in: [EMP_ID] },
    }));
  });
});

describe('reportService.exportRequestsCsv', () => {
  test('produces a CSV header plus one quoted row per request, with embedded quotes escaped', async () => {
    const chain = {};
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockResolvedValue([
      {
        employee: { name: 'Jane "JJ" Doe', email: 'jane@test.com', department: 'Eng' },
        leaveType: { name: 'Casual' },
        startDate: '2026-11-01', endDate: '2026-11-02', days: 2, status: 'APPROVED',
        reason: 'Trip', reviewedBy: { name: 'Mgr' }, reviewComment: 'ok', createdAt: '2026-10-20',
      },
    ]);
    LeaveRequest.find.mockReturnValue(chain);

    const csv = await reportService.exportRequestsCsv({});

    expect(csv).toContain('"Employee","Email","Department"'); // every cell is quoted, header included
    expect(csv).toContain('"Jane ""JJ"" Doe"'); // embedded quote doubled per CSV rules
    expect(csv).toContain('2026-11-01');
  });
});

describe('reportService.getAuditLogs', () => {
  const buildChain = (resolvedLogs) => {
    const q = {};
    q.populate = jest.fn().mockReturnValue(q);
    q.sort = jest.fn().mockReturnValue(q);
    q.skip = jest.fn().mockReturnValue(q);
    q.limit = jest.fn().mockResolvedValue(resolvedLogs);
    return q;
  };

  test('400s on an invalid action filter', async () => {
    await expect(reportService.getAuditLogs({ action: 'NOT_REAL' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('paginates correctly and clamps limit to the 1-100 range', async () => {
    AuditLog.find.mockReturnValue(buildChain([{ _id: 'log1' }]));
    AuditLog.countDocuments.mockResolvedValue(250);

    const result = await reportService.getAuditLogs({ page: 2, limit: 500 });

    expect(result.page).toBe(2);
    expect(result.total).toBe(250);
    expect(result.pages).toBe(3); // ceil(250 / 100)
  });

  test('defaults to page 1, limit 25 with no params', async () => {
    const chain = buildChain([]);
    AuditLog.find.mockReturnValue(chain);
    AuditLog.countDocuments.mockResolvedValue(0);

    const result = await reportService.getAuditLogs();

    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(25);
    expect(result.page).toBe(1);
  });
});
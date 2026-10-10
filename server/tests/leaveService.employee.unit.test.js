jest.mock('../models/LeaveRequest');
jest.mock('../models/LeaveBalance');
jest.mock('../models/LeaveType');
jest.mock('../models/AuditLog');
jest.mock('../models/User');

const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const AuditLog = require('../models/AuditLog');
const leaveService = require('../services/leaveService');

// getAvailableDays builds a real mongoose.Types.ObjectId(userId), which
// throws on short fixture strings like 'emp1' — use real-shaped 24-char hex
// ids instead.
const EMP_ID = '507f1f77bcf86cd799439012';
const LT_ID = '507f1f77bcf86cd799439014';
const BAD_LT_ID = '507f1f77bcf86cd799439099';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leaveService.applyForLeave', () => {
  const mockPendingAggregate = (totalPendingDays) => {
    LeaveRequest.aggregate.mockResolvedValue(
      totalPendingDays === 0 ? [] : [{ _id: null, totalPendingDays }]
    );
  };

  test('400s if the leave type does not exist', async () => {
    LeaveType.findById.mockResolvedValue(null);
    await expect(
      leaveService.applyForLeave(EMP_ID, { leaveTypeId: BAD_LT_ID, startDate: '2026-11-01', endDate: '2026-11-01', reason: 'x' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(LeaveRequest.create).not.toHaveBeenCalled();
  });

  test('400s if there is no balance document for this leave type', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual' });
    LeaveBalance.findOne.mockResolvedValue(null);
    mockPendingAggregate(0);
    await expect(
      leaveService.applyForLeave(EMP_ID, { leaveTypeId: LT_ID, startDate: '2026-11-01', endDate: '2026-11-01', reason: 'x' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('400s if the request exceeds remaining balance', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual' });
    LeaveBalance.findOne.mockResolvedValue({ total: 5, used: 4 }); // 1 day remaining
    mockPendingAggregate(0);
    await expect(
      leaveService.applyForLeave(EMP_ID, { leaveTypeId: LT_ID, startDate: '2026-11-01', endDate: '2026-11-03', reason: 'x' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(LeaveRequest.create).not.toHaveBeenCalled();
  });

  test('400s if balance is technically enough but already-pending requests would overdraw it (closes the double-booking loophole)', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual' });
    LeaveBalance.findOne.mockResolvedValue({ total: 5, used: 0 }); // 5 remaining on paper
    mockPendingAggregate(4); // but 4 days already tied up in other PENDING requests
    await expect(
      leaveService.applyForLeave(EMP_ID, { leaveTypeId: LT_ID, startDate: '2026-11-01', endDate: '2026-11-02', reason: 'x' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates the request and writes a CREATED audit log when everything checks out', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual Leave' });
    LeaveBalance.findOne.mockResolvedValue({ total: 10, used: 2 }); // 8 remaining
    mockPendingAggregate(0);
    LeaveRequest.create.mockResolvedValue({ _id: 'req1', days: 3, status: 'PENDING' });
    AuditLog.create.mockResolvedValue({});

    const result = await leaveService.applyForLeave(EMP_ID, {
      leaveTypeId: LT_ID, startDate: '2026-11-01', endDate: '2026-11-03', reason: 'Trip',
    });

    expect(LeaveRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      employee: EMP_ID, leaveType: LT_ID, days: 3, status: 'PENDING',
    }));
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATED' }));
    expect(result._id).toBe('req1');
  });

  test('a 1-day request (same start and end date) is accepted as exactly 1 day', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual' });
    LeaveBalance.findOne.mockResolvedValue({ total: 10, used: 0 });
    mockPendingAggregate(0);
    LeaveRequest.create.mockResolvedValue({ _id: 'req2', days: 1, status: 'PENDING' });
    AuditLog.create.mockResolvedValue({});

    await leaveService.applyForLeave(EMP_ID, {
      leaveTypeId: LT_ID, startDate: '2026-11-01', endDate: '2026-11-01', reason: 'x',
    });

    expect(LeaveRequest.create).toHaveBeenCalledWith(expect.objectContaining({ days: 1 }));
  });
});

describe('leaveService.cancelLeaveRequest', () => {
  test('404s if the request does not exist', async () => {
    LeaveRequest.findById.mockResolvedValue(null);
    await expect(leaveService.cancelLeaveRequest(EMP_ID, 'req1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('403s if the request belongs to someone else', async () => {
    LeaveRequest.findById.mockResolvedValue({ employee: 'someoneElseId', status: 'PENDING', save: jest.fn() });
    await expect(leaveService.cancelLeaveRequest(EMP_ID, 'req1')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('400s if the request is not PENDING anymore', async () => {
    LeaveRequest.findById.mockResolvedValue({ employee: EMP_ID, status: 'APPROVED', save: jest.fn() });
    await expect(leaveService.cancelLeaveRequest(EMP_ID, 'req1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cancels successfully and logs it when owned and still PENDING', async () => {
    const request = { _id: 'req1', employee: EMP_ID, status: 'PENDING', save: jest.fn().mockResolvedValue(true) };
    LeaveRequest.findById.mockResolvedValue(request);
    AuditLog.create.mockResolvedValue({});

    const result = await leaveService.cancelLeaveRequest(EMP_ID, 'req1');

    expect(request.status).toBe('CANCELLED');
    expect(request.save).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'CANCELLED' }));
    expect(result).toBe(request);
  });
});
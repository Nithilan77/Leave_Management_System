/**
 * Unit tests for the manager-facing parts of leaveService, with the Mongoose
 * models mocked out. This environment cannot download a real/in-memory Mongo
 * binary (network is restricted), so this is NOT a substitute for the
 * integration test (tests/manager.flow.test.js) — run that one against a
 * real MongoDB locally or in CI. This file verifies the actual business
 * logic (team-ownership checks, balance math, status transitions) in
 * isolation, executed for real here.
 */
jest.mock('../models/LeaveRequest');
jest.mock('../models/LeaveBalance');
jest.mock('../models/LeaveType');
jest.mock('../models/AuditLog');
jest.mock('../models/User');

const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const leaveService = require('../services/leaveService');

const mockFindByIdPopulate = (resolvedRequest) => {
  LeaveRequest.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue(resolvedRequest),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leaveService.getTeamRequests', () => {
  test('scopes the query to the manager\'s direct reports', async () => {
    User.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['emp1', 'emp2']) });
    const sortMock = jest.fn().mockResolvedValue([{ _id: 'req1' }]);
    const populate3 = jest.fn().mockReturnValue({ sort: sortMock });
    const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
    const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
    LeaveRequest.find.mockReturnValue({ populate: populate1 });

    const result = await leaveService.getTeamRequests('managerId1', 'PENDING');

    expect(User.find).toHaveBeenCalledWith({ manager: 'managerId1' });
    expect(LeaveRequest.find).toHaveBeenCalledWith({
      employee: { $in: ['emp1', 'emp2'] },
      status: 'PENDING',
    });
    expect(result).toEqual([{ _id: 'req1' }]);
  });

  test('omits the status filter entirely when status is falsy (ALL)', async () => {
    User.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['emp1']) });
    const sortMock = jest.fn().mockResolvedValue([]);
    const populate3 = jest.fn().mockReturnValue({ sort: sortMock });
    const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
    const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
    LeaveRequest.find.mockReturnValue({ populate: populate1 });

    await leaveService.getTeamRequests('managerId1', null);

    expect(LeaveRequest.find).toHaveBeenCalledWith({ employee: { $in: ['emp1'] } });
  });
});

describe('leaveService.approveLeaveRequest', () => {
  const buildRequest = (overrides = {}) => ({
    _id: 'req1',
    status: 'PENDING',
    days: 3,
    leaveType: 'lt1',
    employee: { _id: 'emp1', manager: 'managerA' },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  test('manager approving their own team member succeeds and deducts balance', async () => {
    const request = buildRequest();
    mockFindByIdPopulate(request);
    const balance = { total: 10, used: 2, save: jest.fn().mockResolvedValue(true) };
    LeaveBalance.findOne.mockResolvedValue(balance);
    AuditLog.create.mockResolvedValue({});

    const reviewer = { _id: 'managerA', role: 'manager' };
    const result = await leaveService.approveLeaveRequest(reviewer, 'req1', 'go ahead');

    expect(LeaveBalance.findOne).toHaveBeenCalledWith({ user: 'emp1', leaveType: 'lt1' });
    expect(balance.used).toBe(5); // 2 + 3
    expect(balance.save).toHaveBeenCalled();
    expect(request.status).toBe('APPROVED');
    expect(request.reviewedBy).toBe('managerA');
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVED' }));
    expect(result).toBe(request);
  });

  test('manager approving a request OUTSIDE their team is rejected with 403, and nothing is mutated', async () => {
    const request = buildRequest({ employee: { _id: 'emp1', manager: 'managerA' } });
    mockFindByIdPopulate(request);

    const reviewer = { _id: 'managerB', role: 'manager' };
    await expect(leaveService.approveLeaveRequest(reviewer, 'req1')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(LeaveBalance.findOne).not.toHaveBeenCalled();
    expect(request.save).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  test('HR approving bypasses the team check even though HR is not the manager', async () => {
    const request = buildRequest({ employee: { _id: 'emp1', manager: 'managerA' } });
    mockFindByIdPopulate(request);
    const balance = { total: 10, used: 0, save: jest.fn().mockResolvedValue(true) };
    LeaveBalance.findOne.mockResolvedValue(balance);
    AuditLog.create.mockResolvedValue({});

    const reviewer = { _id: 'hrUser1', role: 'hr' };
    const result = await leaveService.approveLeaveRequest(reviewer, 'req1');

    expect(result.status).toBe('APPROVED');
    expect(balance.used).toBe(3);
  });

  test('rejects with 400 if the request is not PENDING', async () => {
    const request = buildRequest({ status: 'APPROVED' });
    mockFindByIdPopulate(request);

    const reviewer = { _id: 'managerA', role: 'manager' };
    await expect(leaveService.approveLeaveRequest(reviewer, 'req1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects with 400 if the balance is insufficient at approval time', async () => {
    const request = buildRequest({ days: 5 });
    mockFindByIdPopulate(request);
    LeaveBalance.findOne.mockResolvedValue({ total: 10, used: 7, save: jest.fn() });

    const reviewer = { _id: 'managerA', role: 'manager' };
    await expect(leaveService.approveLeaveRequest(reviewer, 'req1')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(request.save).not.toHaveBeenCalled();
  });

  test('404s when the request does not exist', async () => {
    mockFindByIdPopulate(null);
    const reviewer = { _id: 'managerA', role: 'manager' };
    await expect(leaveService.approveLeaveRequest(reviewer, 'missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('leaveService.rejectLeaveRequest', () => {
  const buildRequest = (overrides = {}) => ({
    _id: 'req1',
    status: 'PENDING',
    days: 2,
    leaveType: 'lt1',
    employee: { _id: 'emp1', manager: 'managerA' },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  test('manager rejecting their own team member succeeds, balance untouched', async () => {
    const request = buildRequest();
    mockFindByIdPopulate(request);
    AuditLog.create.mockResolvedValue({});

    const reviewer = { _id: 'managerA', role: 'manager' };
    const result = await leaveService.rejectLeaveRequest(reviewer, 'req1', 'not now');

    expect(LeaveBalance.findOne).not.toHaveBeenCalled();
    expect(request.status).toBe('REJECTED');
    expect(request.reviewComment).toBe('not now');
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'REJECTED' }));
    expect(result).toBe(request);
  });

  test('manager rejecting a request OUTSIDE their team is rejected with 403', async () => {
    const request = buildRequest({ employee: { _id: 'emp1', manager: 'managerA' } });
    mockFindByIdPopulate(request);

    const reviewer = { _id: 'managerB', role: 'manager' };
    await expect(leaveService.rejectLeaveRequest(reviewer, 'req1')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(request.save).not.toHaveBeenCalled();
  });

  test('rejects with 400 if the request is not PENDING', async () => {
    const request = buildRequest({ status: 'REJECTED' });
    mockFindByIdPopulate(request);
    const reviewer = { _id: 'managerA', role: 'manager' };
    await expect(leaveService.rejectLeaveRequest(reviewer, 'req1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
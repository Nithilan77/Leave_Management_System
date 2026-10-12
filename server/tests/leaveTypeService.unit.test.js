jest.mock('../models/LeaveType');
jest.mock('../models/LeaveBalance');
jest.mock('../models/LeaveRequest');
jest.mock('../services/balanceService');

const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const balanceService = require('../services/balanceService');
const leaveTypeService = require('../services/leaveTypeService');

const LT_ID = '507f1f77bcf86cd799439014';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leaveTypeService.listLeaveTypes', () => {
  test('returns all types sorted by name', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ name: 'Casual' }]);
    LeaveType.find.mockReturnValue({ sort: sortMock });

    const result = await leaveTypeService.listLeaveTypes();

    expect(sortMock).toHaveBeenCalledWith({ name: 1 });
    expect(result).toEqual([{ name: 'Casual' }]);
  });
});

describe('leaveTypeService.getLeaveTypeById', () => {
  test('404s when the type does not exist', async () => {
    LeaveType.findById.mockResolvedValue(null);
    await expect(leaveTypeService.getLeaveTypeById(LT_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('400s on a malformed id before ever querying', async () => {
    await expect(leaveTypeService.getLeaveTypeById('not-an-id')).rejects.toMatchObject({ statusCode: 400 });
    expect(LeaveType.findById).not.toHaveBeenCalled();
  });
});

describe('leaveTypeService.createLeaveType', () => {
  test('400s when name is missing or blank', async () => {
    await expect(leaveTypeService.createLeaveType({ name: '   ', annualQuota: 10 }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(LeaveType.create).not.toHaveBeenCalled();
  });

  test('400s when annualQuota is missing, negative, or not a number', async () => {
    await expect(leaveTypeService.createLeaveType({ name: 'Casual' }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(leaveTypeService.createLeaveType({ name: 'Casual', annualQuota: -1 }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(leaveTypeService.createLeaveType({ name: 'Casual', annualQuota: 'abc' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('400s on a case-insensitive duplicate name ("casual" matches "Casual")', async () => {
    LeaveType.findOne.mockReturnValue({ collation: jest.fn().mockResolvedValue({ _id: LT_ID, name: 'Casual' }) });

    await expect(
      leaveTypeService.createLeaveType({ name: 'casual', annualQuota: 10 })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(LeaveType.create).not.toHaveBeenCalled();
  });

  test('creates the type and allocates to all active users by default', async () => {
    LeaveType.findOne.mockReturnValue({ collation: jest.fn().mockResolvedValue(null) });
    LeaveType.create.mockResolvedValue({ _id: LT_ID, name: 'Casual Leave', annualQuota: 12 });
    balanceService.allocateTypeToAllUsers.mockResolvedValue({ created: 7 });

    const result = await leaveTypeService.createLeaveType({ name: '  Casual Leave  ', annualQuota: 12 });

    expect(LeaveType.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Casual Leave', annualQuota: 12 }));
    expect(balanceService.allocateTypeToAllUsers).toHaveBeenCalledWith(LT_ID);
    expect(result.balancesCreated).toBe(7);
  });

  test('skips allocation entirely when allocateToAll is false', async () => {
    LeaveType.findOne.mockReturnValue({ collation: jest.fn().mockResolvedValue(null) });
    LeaveType.create.mockResolvedValue({ _id: LT_ID, name: 'Casual', annualQuota: 12 });

    const result = await leaveTypeService.createLeaveType({ name: 'Casual', annualQuota: 12, allocateToAll: false });

    expect(balanceService.allocateTypeToAllUsers).not.toHaveBeenCalled();
    expect(result.balancesCreated).toBe(0);
  });
});

describe('leaveTypeService.updateLeaveType', () => {
  const buildType = (overrides = {}) => ({
    _id: LT_ID, name: 'Casual', annualQuota: 10, save: jest.fn().mockResolvedValue(true), ...overrides,
  });

  test('400s renaming to a name already used by a DIFFERENT type', async () => {
    const type = buildType();
    LeaveType.findById.mockResolvedValue(type);
    LeaveType.findOne.mockReturnValue({ collation: jest.fn().mockResolvedValue({ _id: 'other-id' }) });

    await expect(
      leaveTypeService.updateLeaveType(LT_ID, { name: 'Sick' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(type.save).not.toHaveBeenCalled();
  });

  test('changing the quota WITHOUT applyToBalances does not touch any LeaveBalance', async () => {
    const type = buildType();
    LeaveType.findById.mockResolvedValue(type);

    const result = await leaveTypeService.updateLeaveType(LT_ID, { annualQuota: 15 });

    expect(type.annualQuota).toBe(15);
    expect(type.save).toHaveBeenCalled();
    expect(LeaveBalance.updateMany).not.toHaveBeenCalled();
    expect(result.balancesUpdated).toBe(0);
  });

  test('changing the quota WITH applyToBalances raises normal balances and caps over-used ones at their used amount', async () => {
    const type = buildType();
    LeaveType.findById.mockResolvedValue(type);
    LeaveBalance.updateMany.mockResolvedValue({ modifiedCount: 3 });
    LeaveBalance.find.mockResolvedValue([
      { _id: 'bal1', used: 20 }, // used MORE than the new quota of 15
    ]);
    LeaveBalance.bulkWrite.mockResolvedValue({});

    const result = await leaveTypeService.updateLeaveType(LT_ID, { annualQuota: 15, applyToBalances: true });

    expect(LeaveBalance.updateMany).toHaveBeenCalledWith(
      { leaveType: LT_ID, used: { $lte: 15 } },
      { $set: { total: 15 } }
    );
    // The over-used balance gets capped at its own `used` (20), not the new quota (15),
    // so `remaining` never goes negative.
    expect(LeaveBalance.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'bal1' }, update: { $set: { total: 20 } } } },
    ]);
    expect(result.balancesUpdated).toBe(4); // 3 normal + 1 over-used
  });

  test('applyToBalances is ignored if the quota did not actually change', async () => {
    const type = buildType({ annualQuota: 10 });
    LeaveType.findById.mockResolvedValue(type);

    const result = await leaveTypeService.updateLeaveType(LT_ID, { annualQuota: 10, applyToBalances: true });

    expect(LeaveBalance.updateMany).not.toHaveBeenCalled();
    expect(result.balancesUpdated).toBe(0);
  });
});

describe('leaveTypeService.deleteLeaveType', () => {
  test('409s (not 400) when the type has leave requests against it — blocks deletion', async () => {
    LeaveType.findById.mockResolvedValue({ _id: LT_ID, name: 'Casual' });
    LeaveRequest.exists.mockResolvedValue(true);

    await expect(leaveTypeService.deleteLeaveType(LT_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(LeaveBalance.deleteMany).not.toHaveBeenCalled();
  });

  test('deletes the type and its balances when unused', async () => {
    const type = { _id: LT_ID, name: 'Casual', deleteOne: jest.fn().mockResolvedValue(true) };
    LeaveType.findById.mockResolvedValue(type);
    LeaveRequest.exists.mockResolvedValue(false);
    LeaveBalance.deleteMany.mockResolvedValue({ deletedCount: 5 });

    const result = await leaveTypeService.deleteLeaveType(LT_ID);

    expect(LeaveBalance.deleteMany).toHaveBeenCalledWith({ leaveType: LT_ID });
    expect(type.deleteOne).toHaveBeenCalled();
    expect(result.balancesDeleted).toBe(5);
  });
});
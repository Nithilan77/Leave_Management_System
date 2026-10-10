jest.mock('../models/User');
jest.mock('../services/balanceService');

const User = require('../models/User');
const balanceService = require('../services/balanceService');
const userService = require('../services/userService');

// assertValidId uses mongoose.Types.ObjectId.isValid, which rejects short
// fixture ids like 'hr1' — use real-shaped 24-char hex ids instead.
const HR_ID = '507f1f77bcf86cd799439011';
const EMP_ID = '507f1f77bcf86cd799439012';
const MGR_ID = '507f1f77bcf86cd799439013';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('userService.createUser', () => {
  test('400s if name, email or password is missing', async () => {
    await expect(userService.createUser({ email: 'a@test.com', password: 'secret123' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(User.create).not.toHaveBeenCalled();
  });

  test('400s on an invalid role', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(
      userService.createUser({ name: 'A', email: 'a@test.com', password: 'secret123', role: 'superadmin' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('400s if the email is already taken', async () => {
    User.findOne.mockResolvedValue({ _id: EMP_ID });
    await expect(
      userService.createUser({ name: 'A', email: 'taken@test.com', password: 'secret123' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates the user and initializes balances on success', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: EMP_ID });
    balanceService.initializeBalancesForUser.mockResolvedValue({ created: 3 });
    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: EMP_ID, toObject: () => ({ _id: EMP_ID }) }),
    });

    const result = await userService.createUser({
      name: 'A', email: 'a@test.com', password: 'secret123', role: 'employee',
    });

    expect(balanceService.initializeBalancesForUser).toHaveBeenCalledWith(EMP_ID);
    expect(result.balancesCreated).toBe(3);
  });
});

describe('userService.updateUser — self-protection guard', () => {
  test('blocks an HR user from removing their own HR role', async () => {
    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: HR_ID, role: 'hr', toObject: () => ({ _id: HR_ID, role: 'hr' }) }),
    });
    await expect(
      userService.updateUser(HR_ID, HR_ID, { role: 'employee' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('allows an HR user to change OTHER fields about themselves (not role)', async () => {
    const fakeUser = { _id: HR_ID, role: 'hr', name: 'Old Name', save: jest.fn().mockResolvedValue(true) };
    User.findById
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(fakeUser) })
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ ...fakeUser, name: 'New Name' }) });

    const result = await userService.updateUser(HR_ID, HR_ID, { name: 'New Name' });

    expect(fakeUser.save).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });

  test("allows HR to change ANOTHER user's role freely", async () => {
    const targetUser = { _id: EMP_ID, role: 'employee', save: jest.fn().mockResolvedValue(true) };
    User.findById
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(targetUser) })
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ ...targetUser, role: 'manager' }) });

    const result = await userService.updateUser(HR_ID, EMP_ID, { role: 'manager' });

    expect(targetUser.save).toHaveBeenCalled();
    expect(result.role).toBe('manager');
  });
});

describe('userService.setUserStatus — self-lockout guard', () => {
  test('blocks an HR user from deactivating their own account', async () => {
    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: HR_ID, isActive: true, save: jest.fn() }),
    });
    await expect(
      userService.setUserStatus(HR_ID, HR_ID, false)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('allows an HR user to deactivate someone else', async () => {
    const targetUser = { _id: EMP_ID, isActive: true, save: jest.fn().mockResolvedValue(true) };
    User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(targetUser) });

    const result = await userService.setUserStatus(HR_ID, EMP_ID, false);

    expect(targetUser.isActive).toBe(false);
    expect(targetUser.save).toHaveBeenCalled();
  });

  test('400s if isActive is not a boolean', async () => {
    await expect(userService.setUserStatus(HR_ID, EMP_ID, 'yes')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('userService manager validation (via createUser)', () => {
  test('rejects assigning a manager who does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue(null);
    await expect(
      userService.createUser({ name: 'A', email: 'a@test.com', password: 'secret123', manager: MGR_ID })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects assigning a manager whose role is "employee"', async () => {
    User.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue({ _id: MGR_ID, isActive: true, role: 'employee' });
    await expect(
      userService.createUser({ name: 'A', email: 'a@test.com', password: 'secret123', manager: MGR_ID })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('accepts a valid active manager', async () => {
    User.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValueOnce({ _id: MGR_ID, isActive: true, role: 'manager' });
    User.create.mockResolvedValue({ _id: EMP_ID });
    balanceService.initializeBalancesForUser.mockResolvedValue({ created: 2 });
    User.findById.mockReturnValueOnce({
      populate: jest.fn().mockResolvedValue({ _id: EMP_ID, toObject: () => ({ _id: EMP_ID }) }),
    });

    const result = await userService.createUser({
      name: 'A', email: 'a@test.com', password: 'secret123', manager: MGR_ID,
    });

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ manager: MGR_ID }));
    expect(result.balancesCreated).toBe(2);
  });
});
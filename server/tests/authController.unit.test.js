jest.mock('../models/User');
jest.mock('../utils/generateToken');

const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { registerUser, loginUser, getMe } = require('../controllers/authController');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  generateToken.mockReturnValue('fake.jwt.token');
});

describe('authController.registerUser', () => {
  test('400s when name, email or password is missing', async () => {
    const req = { body: { email: 'a@test.com', password: 'secret123' } };
    const res = makeRes();
    const next = jest.fn();
    await registerUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test('400s when the email is already taken', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });
    const req = { body: { name: 'A', email: 'taken@test.com', password: 'secret123' } };
    const res = makeRes();
    const next = jest.fn();
    await registerUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('creates the user and returns a token on success', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: 'u1', name: 'A', email: 'a@test.com', role: 'employee', department: 'Eng',
    });
    const req = { body: { name: 'A', email: 'a@test.com', password: 'secret123' } };
    const res = makeRes();
    const next = jest.fn();
    await registerUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'fake.jwt.token' }));
    expect(next).not.toHaveBeenCalled();
  });

    /**
   * SECURITY FIX VERIFICATION — this used to be exploitable: a self-
   * registering user could set role: 'hr' in the request body and grant
   * themselves admin rights. Fixed in authController by hardcoding
   * role: 'employee' and ignoring whatever the client sends. This test
   * proves the fix holds, rather than just trusting the diff.
   */
  test('ignores any role sent by the client and always registers as employee, even role: hr', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation((data) => Promise.resolve({ _id: 'u1', ...data }));
    const req = { body: { name: 'Attacker', email: 'attacker@test.com', password: 'secret123', role: 'hr' } };
    const res = makeRes();
    const next = jest.fn();
    await registerUser(req, res, next);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'employee' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ role: 'employee' }) }));
  });

});

describe('authController.loginUser', () => {
  test('400s when email or password is missing', async () => {
    const req = { body: { email: 'a@test.com' } };
    const res = makeRes();
    const next = jest.fn();
    await loginUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('401s with a generic message when the user does not exist', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'nobody@test.com', password: 'wrong' } };
    const res = makeRes();
    const next = jest.fn();
    await loginUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next.mock.calls[0][0].message).toBe('Invalid email or password');
  });

  test('401s with the SAME generic message when the password is wrong (does not reveal which was invalid)', async () => {
    const fakeUser = { matchPassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    const req = { body: { email: 'a@test.com', password: 'wrong' } };
    const res = makeRes();
    const next = jest.fn();
    await loginUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next.mock.calls[0][0].message).toBe('Invalid email or password');
  });

  test('403s when the account is deactivated', async () => {
    const fakeUser = { matchPassword: jest.fn().mockResolvedValue(true), isActive: false };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    const req = { body: { email: 'a@test.com', password: 'right' } };
    const res = makeRes();
    const next = jest.fn();
    await loginUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('logs in successfully and returns a token', async () => {
    const fakeUser = {
      _id: 'u1', name: 'A', email: 'a@test.com', role: 'employee', department: 'Eng',
      isActive: true, matchPassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    const req = { body: { email: 'a@test.com', password: 'right' } };
    const res = makeRes();
    const next = jest.fn();
    await loginUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'fake.jwt.token' }));
  });
});

describe('authController.getMe', () => {
  test('returns req.user as set by the protect middleware', async () => {
    const req = { user: { _id: 'u1', name: 'A', role: 'employee' } };
    const res = makeRes();
    const next = jest.fn();
    await getMe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, user: req.user });
  });
});
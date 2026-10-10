const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../app');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const AuditLog = require('../models/AuditLog');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const createUser = async ({ name, email, role, managerId = null }) => {
  const user = await User.create({
    name, email, password: 'password123', role, manager: managerId,
  });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(loginRes.status).toBe(200);
  return { user, token: loginRes.body.token };
};

describe('Manager vertical — full apply -> approve/reject workflow', () => {
  test('employee applies, manager approves, balance is deducted, audit log written', async () => {
    const manager = await createUser({ name: 'Mani Manager', email: 'manager@test.com', role: 'manager' });
    const employee = await createUser({
      name: 'Emp One', email: 'emp1@test.com', role: 'employee', managerId: manager.user._id,
    });

    const leaveType = await LeaveType.create({ name: 'Casual Leave', annualQuota: 12 });
    await LeaveBalance.create({ user: employee.user._id, leaveType: leaveType._id, total: 12, used: 0 });

    const applyRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({
        leaveTypeId: leaveType._id, startDate: '2026-11-02', endDate: '2026-11-04', reason: 'Trip',
      });
    expect(applyRes.status).toBe(201);
    const requestId = applyRes.body.request._id;

    const queueRes = await request(app)
      .get('/api/manager/team')
      .set('Authorization', `Bearer ${manager.token}`);
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.count).toBe(1);
    expect(queueRes.body.requests[0]._id).toBe(requestId);

    const approveRes = await request(app)
      .patch(`/api/manager/leaves/${requestId}/approve`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ comment: 'Enjoy the trip' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe('APPROVED');

    const balance = await LeaveBalance.findOne({ user: employee.user._id, leaveType: leaveType._id });
    expect(balance.used).toBe(3);

    const logs = await AuditLog.find({ request: requestId });
    expect(logs.some((l) => l.action === 'APPROVED' && String(l.performedBy) === String(manager.user._id))).toBe(true);
  });

  test('reject requires a comment, logs REJECTED, and does not touch balance', async () => {
    const manager = await createUser({ name: 'Mani Manager', email: 'manager2@test.com', role: 'manager' });
    const employee = await createUser({
      name: 'Emp Two', email: 'emp2@test.com', role: 'employee', managerId: manager.user._id,
    });
    const leaveType = await LeaveType.create({ name: 'Sick Leave', annualQuota: 10 });
    await LeaveBalance.create({ user: employee.user._id, leaveType: leaveType._id, total: 10, used: 0 });

    const applyRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({ leaveTypeId: leaveType._id, startDate: '2026-11-10', endDate: '2026-11-10', reason: 'Fever' });
    const requestId = applyRes.body.request._id;

    const badReject = await request(app)
      .patch(`/api/manager/leaves/${requestId}/reject`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({});
    expect(badReject.status).toBe(400);

    const reject = await request(app)
      .patch(`/api/manager/leaves/${requestId}/reject`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ comment: 'No coverage that day' });
    expect(reject.status).toBe(200);
    expect(reject.body.request.status).toBe('REJECTED');

    const balance = await LeaveBalance.findOne({ user: employee.user._id, leaveType: leaveType._id });
    expect(balance.used).toBe(0);
  });

  test('a manager cannot approve a request from outside their team', async () => {
    const managerA = await createUser({ name: 'Manager A', email: 'mgra@test.com', role: 'manager' });
    const managerB = await createUser({ name: 'Manager B', email: 'mgrb@test.com', role: 'manager' });
    const employee = await createUser({
      name: 'Emp Three', email: 'emp3@test.com', role: 'employee', managerId: managerA.user._id,
    });
    const leaveType = await LeaveType.create({ name: 'Earned Leave', annualQuota: 15 });
    await LeaveBalance.create({ user: employee.user._id, leaveType: leaveType._id, total: 15, used: 0 });

    const applyRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({ leaveTypeId: leaveType._id, startDate: '2026-12-01', endDate: '2026-12-01', reason: 'Personal' });
    const requestId = applyRes.body.request._id;

    const queueB = await request(app)
      .get('/api/manager/team')
      .set('Authorization', `Bearer ${managerB.token}`);
    expect(queueB.body.count).toBe(0);

    const approveAttempt = await request(app)
      .patch(`/api/manager/leaves/${requestId}/approve`)
      .set('Authorization', `Bearer ${managerB.token}`)
      .send({});
    expect(approveAttempt.status).toBe(403);
  });

  test('an employee cannot hit manager routes at all', async () => {
    const employee = await createUser({ name: 'Emp Four', email: 'emp4@test.com', role: 'employee' });
    const res = await request(app)
      .get('/api/manager/team')
      .set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(403);
  });
});
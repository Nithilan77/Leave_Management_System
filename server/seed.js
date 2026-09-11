/**
 * seed.js  —  Development data seeder
 * ------------------------------------
 * Populates the database with starter data so you can test the app before the
 * HR vertical (which normally manages this) is built.
 *
 * It creates:
 *   - 3 leave types (Casual, Sick, Earned)
 *   - a test employee, manager, and HR user
 *   - leave balances for the test employee (one per leave type)
 *
 * Run it with:   node seed.js
 * Wipe + reseed: node seed.js --fresh   (deletes existing seeded data first)
 *
 * NOTE: This is a DEV utility. Never run it against a production database.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const LeaveType = require('./models/LeaveType');
const LeaveBalance = require('./models/LeaveBalance');
const LeaveRequest = require('./models/LeaveRequest');
const AuditLog = require('./models/AuditLog');

const FRESH = process.argv.includes('--fresh');

const seed = async () => {
  await connectDB();
  console.log('Connected. Seeding...');

  if (FRESH) {
    console.log('--fresh: clearing existing data');
    await Promise.all([
      User.deleteMany({}),
      LeaveType.deleteMany({}),
      LeaveBalance.deleteMany({}),
      LeaveRequest.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
  }

  // ---- Leave types ----
  const typeDefs = [
    { name: 'Casual', annualQuota: 12, description: 'Casual leave' },
    { name: 'Sick', annualQuota: 10, description: 'Sick leave' },
    { name: 'Earned', annualQuota: 15, description: 'Earned/privilege leave' },
  ];

  const types = {};
  for (const def of typeDefs) {
    let t = await LeaveType.findOne({ name: def.name });
    if (!t) t = await LeaveType.create(def);
    types[def.name] = t;
  }
  console.log(`Leave types ready: ${Object.keys(types).join(', ')}`);

  // ---- Users (created via model so passwords get hashed) ----
  // Manager first, so the employee can reference them.
  const ensureUser = async (data) => {
    let u = await User.findOne({ email: data.email });
    if (!u) u = await User.create(data);
    return u;
  };

  const hr = await ensureUser({
    name: 'HR Admin', email: 'hr@lms.com', password: 'password123', role: 'hr', department: 'HR',
  });
  const manager = await ensureUser({
    name: 'Manager Mike', email: 'manager@lms.com', password: 'password123', role: 'manager', department: 'Engineering',
  });
  const employee = await ensureUser({
    name: 'Employee Emma', email: 'employee@lms.com', password: 'password123',
    role: 'employee', department: 'Engineering', manager: manager._id,
  });
  console.log('Users ready: hr@lms.com, manager@lms.com, employee@lms.com  (all password: password123)');

  // ---- Balances for the test employee (one per type) ----
  for (const name of Object.keys(types)) {
    const t = types[name];
    const existing = await LeaveBalance.findOne({ user: employee._id, leaveType: t._id });
    if (!existing) {
      await LeaveBalance.create({
        user: employee._id,
        leaveType: t._id,
        total: t.annualQuota,
        used: 0,
      });
    }
  }
  console.log('Balances created for employee@lms.com');

  console.log('\n✅ Seed complete. Log in as employee@lms.com / password123 to test applying for leave.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (e) => {
  console.error('Seed failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});

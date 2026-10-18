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
    if (!u) {
      u = await User.create(data);
    } else {
      u.password = data.password;
      u.role = data.role;
      u.department = data.department;
      if (data.manager) u.manager = data.manager;
      await u.save();
    }
    return u;
  };

  const hr = await ensureUser({
    name: 'HR Admin', email: 'hr@ssn.com', password: '123', role: 'hr', department: 'HR',
  });
  // Manager's email is overridable via DEMO_MANAGER_EMAIL so you can point
  // it at a real inbox you control for the viva — e.g. the same address you
  // signed up to Resend with, since the sandbox sender only delivers there.
  // Falls back to nithilan7437@gmail.com if the env var isn't set.
  const managerEmail = process.env.DEMO_MANAGER_EMAIL || 'nithilan7437@gmail.com';
  const manager = await ensureUser({
    name: 'Manager Mike', email: managerEmail, password: '123', role: 'manager', department: 'Engineering',
  });
  const employee = await ensureUser({
    name: 'Employee Emma', email: 'employee@ssn.com', password: '123',
    role: 'employee', department: 'Engineering', manager: manager._id,
  });
  console.log(`Users ready: hr@ssn.com, ${managerEmail}, employee@ssn.com  (all password: 123)`);

  // ---- Balances for EVERY seeded user, one per leave type ----
  // A manager or HR user is also an employee of the system (they can apply
  // for their own leave — see client/src/components/managerNav.js /
  // hrNav.js), so they need balances too, not just the plain employee.
  // Previously this loop only ran for `employee`, which left managers/HR
  // with an empty "Apply for Leave" dropdown ("No leave types available").
  const allUsers = [hr, manager, employee];
  let balancesCreated = 0;
  for (const u of allUsers) {
    for (const name of Object.keys(types)) {
      const t = types[name];
      const existing = await LeaveBalance.findOne({ user: u._id, leaveType: t._id });
      if (!existing) {
        await LeaveBalance.create({
          user: u._id,
          leaveType: t._id,
          total: t.annualQuota,
          used: 0,
        });
        balancesCreated += 1;
      }
    }
  }
  console.log(`Balances ready for hr@ssn.com, ${managerEmail}, employee@ssn.com (${balancesCreated} created)`);

  console.log(`\n✅ Seed complete. Log in as employee@ssn.com / ${managerEmail} / hr@ssn.com (password: 123) to test applying for leave.`); 
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (e) => {
  console.error('Seed failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});

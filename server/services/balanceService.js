const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const { createError, assertValidId } = require('../utils/createError');

/**
 * balanceService  (HR vertical)
 * ------------------------------
 * Everything to do with ALLOCATING leave: giving users their yearly balances,
 * adjusting one person's allocation, and the year-end reset.
 *
 * Note the split of responsibilities with the other verticals:
 *   - HR (here) decides how many days someone GETS     -> balance.total
 *   - Manager approval (leaveService) records days USED -> balance.used
 * HR never touches `used` except during the year-end reset.
 *
 * All "give everyone a balance" operations use bulkWrite with upsert +
 * $setOnInsert. That makes them IDEMPOTENT: running them twice never creates a
 * duplicate (the unique index on {user, leaveType} also guarantees this) and
 * never overwrites a balance that already exists.
 */

/**
 * Create a balance for every leave type for ONE user (if missing).
 * Called automatically when HR creates a user, and available as a manual
 * "initialize balances" action for users created through /api/auth/register.
 */
const initializeBalancesForUser = async (userId) => {
  assertValidId(userId, 'user id');
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);

  const types = await LeaveType.find();
  if (types.length === 0) return { created: 0 };

  const result = await LeaveBalance.bulkWrite(
    types.map((t) => ({
      updateOne: {
        filter: { user: user._id, leaveType: t._id },
        update: { $setOnInsert: { total: t.annualQuota, used: 0 } },
        upsert: true,
      },
    }))
  );

  return { created: result.upsertedCount };
};

/**
 * Give every ACTIVE user a balance for ONE leave type (if missing).
 * Used right after HR creates a new leave type.
 */
const allocateTypeToAllUsers = async (leaveTypeId) => {
  assertValidId(leaveTypeId, 'leave type id');
  const type = await LeaveType.findById(leaveTypeId);
  if (!type) throw createError('Leave type not found', 404);

  const users = await User.find({ isActive: true }).select('_id');
  if (users.length === 0) return { created: 0 };

  const result = await LeaveBalance.bulkWrite(
    users.map((u) => ({
      updateOne: {
        filter: { user: u._id, leaveType: type._id },
        update: { $setOnInsert: { total: type.annualQuota, used: 0 } },
        upsert: true,
      },
    }))
  );

  return { created: result.upsertedCount };
};

/**
 * Get one user's balances (HR view of any employee).
 */
const getUserBalances = async (userId) => {
  assertValidId(userId, 'user id');
  const exists = await User.exists({ _id: userId });
  if (!exists) throw createError('User not found', 404);

  return LeaveBalance.find({ user: userId }).populate('leaveType', 'name annualQuota');
};

/**
 * Set (or create) one user's total allocation for one leave type.
 * Example: give an employee 2 extra casual days -> total 12 -> 14.
 *
 * Guard: total can't drop below what's already been used, otherwise
 * `remaining` would go negative.
 */
const setUserBalance = async (userId, leaveTypeId, total) => {
  assertValidId(userId, 'user id');
  assertValidId(leaveTypeId, 'leave type id');

  const newTotal = Number(total);
  if (!Number.isFinite(newTotal) || newTotal < 0) {
    throw createError('total must be a number of days, 0 or more', 400);
  }

  const [user, type] = await Promise.all([
    User.exists({ _id: userId }),
    LeaveType.exists({ _id: leaveTypeId }),
  ]);
  if (!user) throw createError('User not found', 404);
  if (!type) throw createError('Leave type not found', 404);

  let balance = await LeaveBalance.findOne({ user: userId, leaveType: leaveTypeId });

  if (!balance) {
    balance = await LeaveBalance.create({ user: userId, leaveType: leaveTypeId, total: newTotal, used: 0 });
  } else {
    if (newTotal < balance.used) {
      throw createError(
        `total cannot be less than days already used (${balance.used})`,
        400
      );
    }
    balance.total = newTotal;
    await balance.save();
  }

  return balance.populate('leaveType', 'name annualQuota');
};

/**
 * Year-end reset: every balance goes back to its leave type's annual quota,
 * with used = 0. Runs one updateMany per leave type.
 *
 * Pending requests are left alone; they'll be checked against the fresh
 * balance when a manager reviews them.
 */
const resetAllBalances = async () => {
  const types = await LeaveType.find();
  let modified = 0;

  for (const t of types) {
    const result = await LeaveBalance.updateMany(
      { leaveType: t._id },
      { $set: { total: t.annualQuota, used: 0 } }
    );
    modified += result.modifiedCount;
  }

  return { modified };
};

module.exports = {
  initializeBalancesForUser,
  allocateTypeToAllUsers,
  getUserBalances,
  setUserBalance,
  resetAllBalances,
};

const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const balanceService = require('./balanceService');
const { createError, assertValidId } = require('../utils/createError');

/**
 * leaveTypeService  (HR vertical)
 * --------------------------------
 * HR manages the leave POLICY: which leave types exist and how many days of
 * each everyone gets per year (annualQuota).
 *
 * Policy decisions encoded here:
 *  - Creating a type can immediately allocate it to every active user.
 *  - Changing a quota only changes existing balances if HR asks for it
 *    (applyToBalances). Even then a balance never drops below what the
 *    person has already used.
 *  - A type that has been used in any leave request can't be deleted —
 *    that would orphan request history. Unused types can be deleted, along
 *    with their (empty) balances.
 */

const listLeaveTypes = async () => {
  return LeaveType.find().sort({ name: 1 });
};

const getLeaveTypeById = async (id) => {
  assertValidId(id, 'leave type id');
  const type = await LeaveType.findById(id);
  if (!type) throw createError('Leave type not found', 404);
  return type;
};

/**
 * Create a leave type. If allocateToAll is true (the default), every active
 * user immediately gets a balance of `annualQuota` days for it.
 */
const createLeaveType = async ({ name, annualQuota, description, allocateToAll = true }) => {
  if (!name || !String(name).trim()) throw createError('name is required', 400);

  const quota = Number(annualQuota);
  if (annualQuota === undefined || annualQuota === '' || !Number.isFinite(quota) || quota < 0) {
    throw createError('annualQuota must be a number of days, 0 or more', 400);
  }

  // Case-insensitive duplicate check ("casual" vs "Casual").
  const duplicate = await LeaveType.findOne({ name: String(name).trim() })
    .collation({ locale: 'en', strength: 2 });
  if (duplicate) throw createError('A leave type with this name already exists', 400);

  const type = await LeaveType.create({
    name: String(name).trim(),
    annualQuota: quota,
    description,
  });

  let balancesCreated = 0;
  if (allocateToAll) {
    ({ created: balancesCreated } = await balanceService.allocateTypeToAllUsers(type._id));
  }

  return { leaveType: type, balancesCreated };
};

/**
 * Update a leave type.
 * If annualQuota changes and applyToBalances is true, every existing balance
 * of this type gets the new total — but never less than its `used` days.
 */
const updateLeaveType = async (id, { name, annualQuota, description, applyToBalances = false }) => {
  const type = await getLeaveTypeById(id);

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw createError('name cannot be empty', 400);
    const duplicate = await LeaveType.findOne({ name: trimmed, _id: { $ne: type._id } })
      .collation({ locale: 'en', strength: 2 });
    if (duplicate) throw createError('A leave type with this name already exists', 400);
    type.name = trimmed;
  }

  let quotaChanged = false;
  if (annualQuota !== undefined) {
    const quota = Number(annualQuota);
    if (annualQuota === '' || !Number.isFinite(quota) || quota < 0) {
      throw createError('annualQuota must be a number of days, 0 or more', 400);
    }
    quotaChanged = quota !== type.annualQuota;
    type.annualQuota = quota;
  }

  if (description !== undefined) type.description = description;

  await type.save();

  let balancesUpdated = 0;
  if (quotaChanged && applyToBalances) {
    // New total = max(newQuota, used), so `remaining` never goes negative.
    // 1) Balances that have used no more than the new quota -> total = quota
    const normal = await LeaveBalance.updateMany(
      { leaveType: type._id, used: { $lte: type.annualQuota } },
      { $set: { total: type.annualQuota } }
    );
    // 2) Balances that already used MORE than the new quota -> total = used
    const overUsed = await LeaveBalance.find({
      leaveType: type._id,
      used: { $gt: type.annualQuota },
    });
    if (overUsed.length) {
      await LeaveBalance.bulkWrite(
        overUsed.map((b) => ({
          updateOne: { filter: { _id: b._id }, update: { $set: { total: b.used } } },
        }))
      );
    }
    balancesUpdated = normal.modifiedCount + overUsed.length;
  }

  return { leaveType: type, balancesUpdated };
};

/**
 * Delete a leave type — only if no leave request has ever used it.
 */
const deleteLeaveType = async (id) => {
  const type = await getLeaveTypeById(id);

  const used = await LeaveRequest.exists({ leaveType: type._id });
  if (used) {
    throw createError(
      'This leave type has leave requests against it and cannot be deleted',
      409
    );
  }

  const { deletedCount } = await LeaveBalance.deleteMany({ leaveType: type._id });
  await type.deleteOne();

  return { id: type._id, balancesDeleted: deletedCount };
};

module.exports = {
  listLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
};

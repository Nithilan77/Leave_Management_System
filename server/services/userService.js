const User = require('../models/User');
const balanceService = require('./balanceService');
const { createError, assertValidId } = require('../utils/createError');

/**
 * userService  (HR vertical)
 * ---------------------------
 * Business logic for HR managing people: listing, creating, editing,
 * activating/deactivating, and resetting passwords.
 *
 * Design rules worth knowing for the viva:
 *  - We never DELETE users. Their leave requests and audit logs point at them,
 *    so deleting would break history. HR deactivates instead (isActive=false),
 *    and both login and `protect` already refuse inactive accounts.
 *  - An HR user can't deactivate themselves or remove their own HR role,
 *    so the system can't be locked out of its last admin by accident.
 *  - A user's `manager` must be an active manager or HR user.
 */

const ROLES = ['employee', 'manager', 'hr'];

// Fields HR is allowed to change through the edit endpoint. Password and
// isActive have their own dedicated endpoints.
const EDITABLE_FIELDS = ['name', 'email', 'role', 'department', 'manager'];

// Escape user input before putting it in a RegExp (so "a.b" doesn't match "axb").
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Shape we send back — never includes the password hash.
const publicUser = (u) => {
  const obj = u.toObject ? u.toObject() : u;
  delete obj.password;
  return obj;
};

/**
 * Check that `managerId` points to an active manager/HR user.
 * Empty values ('' or null) mean "no manager" and are allowed.
 */
const validateManager = async (managerId, selfId = null) => {
  if (!managerId) return null;
  assertValidId(managerId, 'manager id');

  if (selfId && String(managerId) === String(selfId)) {
    throw createError('A user cannot be their own manager', 400);
  }

  const manager = await User.findById(managerId);
  if (!manager || !manager.isActive) {
    throw createError('Manager not found or inactive', 400);
  }
  if (!['manager', 'hr'].includes(manager.role)) {
    throw createError('Selected manager must have the manager or hr role', 400);
  }
  return manager._id;
};

/**
 * List users with optional filters.
 *   role, department, isActive ('true' / 'false'), search (name or email)
 */
const listUsers = async ({ role, department, isActive, search } = {}) => {
  const filter = {};

  if (role) {
    if (!ROLES.includes(role)) throw createError('Invalid role filter', 400);
    filter.role = role;
  }
  if (department) filter.department = department;
  if (isActive === 'true' || isActive === true) filter.isActive = true;
  if (isActive === 'false' || isActive === false) filter.isActive = false;

  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  return User.find(filter)
    .populate('manager', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Active managers + HR, for the "assign manager" dropdown on the frontend.
 */
const listManagers = async () => {
  return User.find({ role: { $in: ['manager', 'hr'] }, isActive: true })
    .select('name email role department')
    .sort({ name: 1 });
};

const getUserById = async (userId) => {
  assertValidId(userId, 'user id');
  const user = await User.findById(userId).populate('manager', 'name email');
  if (!user) throw createError('User not found', 404);
  return user;
};

/**
 * HR creates a user account. Their leave balances are set up straight away,
 * one per existing leave type, using each type's annual quota.
 */
const createUser = async ({ name, email, password, role, department, manager }) => {
  if (!name || !email || !password) {
    throw createError('name, email and password are required', 400);
  }
  if (role && !ROLES.includes(role)) {
    throw createError(`role must be one of: ${ROLES.join(', ')}`, 400);
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw createError('A user with this email already exists', 400);

  const managerId = await validateManager(manager);

  // Password is hashed by the User model's pre-save hook.
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'employee',
    department,
    manager: managerId,
  });

  const { created } = await balanceService.initializeBalancesForUser(user._id);

  const saved = await User.findById(user._id).populate('manager', 'name email');
  return { user: publicUser(saved), balancesCreated: created };
};

/**
 * Edit a user's details (not password / active status).
 * @param actingUserId - the HR user making the change
 */
const updateUser = async (actingUserId, userId, updates = {}) => {
  const user = await getUserById(userId);

  // Only copy fields we allow; ignore anything else in the body.
  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) changes[field] = updates[field];
  }

  if (changes.role !== undefined) {
    if (!ROLES.includes(changes.role)) {
      throw createError(`role must be one of: ${ROLES.join(', ')}`, 400);
    }
    if (String(user._id) === String(actingUserId) && changes.role !== 'hr') {
      throw createError('You cannot remove your own HR role', 400);
    }
  }

  if (changes.email !== undefined) {
    const email = String(changes.email).toLowerCase().trim();
    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) throw createError('Another user already has this email', 400);
    changes.email = email;
  }

  if (changes.manager !== undefined) {
    changes.manager = await validateManager(changes.manager, user._id);
  }

  Object.assign(user, changes);
  await user.save(); // runs schema validators (e.g. role enum)

  return getUserById(user._id);
};

/**
 * Activate or deactivate an account.
 */
const setUserStatus = async (actingUserId, userId, isActive) => {
  if (typeof isActive !== 'boolean') {
    throw createError('isActive must be true or false', 400);
  }
  const user = await getUserById(userId);

  if (String(user._id) === String(actingUserId) && !isActive) {
    throw createError('You cannot deactivate your own account', 400);
  }

  user.isActive = isActive;
  await user.save();
  return user;
};

/**
 * HR sets a new password for a user (e.g. they forgot theirs).
 */
const resetPassword = async (userId, newPassword) => {
  if (!newPassword || String(newPassword).length < 6) {
    throw createError('New password must be at least 6 characters', 400);
  }
  assertValidId(userId, 'user id');

  const user = await User.findById(userId).select('+password');
  if (!user) throw createError('User not found', 404);

  user.password = newPassword; // pre-save hook hashes it
  await user.save();
  return { id: user._id };
};

module.exports = {
  listUsers,
  listManagers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  resetPassword,
};

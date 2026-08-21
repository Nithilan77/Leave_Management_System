const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User model
 * -----------
 * Represents every person in the system. A single model holds all three roles
 * (employee, manager, hr) — the `role` field decides what a user is allowed to do.
 *
 * Key design choices you should be able to explain in the viva:
 *  - Passwords are NEVER stored in plain text. We hash them with bcrypt in a
 *    pre-save hook (see below), so even we can't read them.
 *  - `manager` is a self-reference: an employee points to another User (their
 *    manager). This models the reporting hierarchy without a separate table.
 *  - `role` is an enum, so the database only ever accepts the three valid roles.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,          // no two users can share an email
      lowercase: true,       // store emails consistently in lower case
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,         // don't return the password by default in queries
    },
    role: {
      type: String,
      enum: ['employee', 'manager', 'hr'],  // only these three are allowed
      default: 'employee',
    },
    department: {
      type: String,
      trim: true,
    },
    // Self-reference: which User is this person's manager.
    // Employees point to a manager; managers/HR may have this empty.
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,         // HR can deactivate a user instead of deleting
    },
  },
  {
    // Adds createdAt and updatedAt fields automatically.
    timestamps: true,
  }
);

/**
 * Pre-save hook: hash the password before saving.
 * Runs automatically on user.save(). We only re-hash if the password field
 * changed (otherwise updating other fields would double-hash it).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Instance method to compare a plain-text password (from login) against the
 * stored hash. Returns true/false. Used by the auth logic later.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

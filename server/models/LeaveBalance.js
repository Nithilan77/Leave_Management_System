const mongoose = require('mongoose');

/**
 * LeaveBalance model
 * -------------------
 * Tracks how much of each leave type a specific user has left.
 * There is one balance document per (user + leaveType) pair.
 *   e.g. Nithilan | Casual | total 12 | used 3 | remaining 9
 *
 * When a leave request is APPROVED, we increase `used`, which reduces
 * `remaining`. This is the data the "apply for leave" check reads to make
 * sure an employee has enough days.
 */
const leaveBalanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

/**
 * Prevent duplicate balances: a user can only have ONE balance document per
 * leave type. This compound unique index enforces that at the database level.
 */
leaveBalanceSchema.index({ user: 1, leaveType: 1 }, { unique: true });

/**
 * Virtual field `remaining` = total - used.
 * A "virtual" is computed on the fly and not stored in the database, so it can
 * never get out of sync with total/used. We enable virtuals in JSON output so
 * the frontend receives `remaining` in API responses.
 */
leaveBalanceSchema.virtual('remaining').get(function () {
  return this.total - this.used;
});

leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);

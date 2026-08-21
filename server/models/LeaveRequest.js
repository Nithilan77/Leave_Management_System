const mongoose = require('mongoose');

/**
 * LeaveRequest model
 * -------------------
 * The heart of the system. Represents a single leave application and tracks
 * it through the approval workflow via the `status` field.
 *
 * Lifecycle of `status`:
 *   PENDING   -> just submitted, waiting for a manager
 *   APPROVED  -> manager/HR approved; balance gets deducted
 *   REJECTED  -> manager/HR declined (with a reason in reviewComment)
 *   CANCELLED -> employee withdrew it before a decision
 *   ESCALATED -> overdue; raised to HR (optional / nice-to-have)
 *
 * `reviewedBy` and `reviewComment` record WHO acted on it and WHY — part of
 * accountability. Every change here should also create an AuditLog entry.
 */
const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // Number of days requested. Computed when the request is created.
    days: {
      type: Number,
      required: true,
      min: [1, 'Leave must be at least 1 day'],
    },
    reason: {
      type: String,
      required: [true, 'A reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'],
      default: 'PENDING',
    },
    // The manager/HR who reviewed it (empty while still pending).
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewComment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

/**
 * Basic validation: end date can't be before start date.
 * Runs on save; catches obviously invalid ranges before they reach the DB.
 */
leaveRequestSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);

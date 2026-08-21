const mongoose = require('mongoose');

/**
 * AuditLog model
 * ---------------
 * The audit trail — one of the features that makes this an "enterprise" system.
 * Every meaningful action on a leave request creates an immutable log entry
 * recording WHAT happened, on WHICH request, by WHOM, and WHEN.
 *
 * This lets HR answer questions like "who approved request X and at what time?"
 * and demonstrates accountability and transparency.
 *
 * We never update or delete audit logs — they are append-only history.
 */
const auditLogSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      required: true,
    },
    action: {
      type: String,
      enum: ['CREATED', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'],
      required: true,
    },
    // The user who performed the action.
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional human-readable detail, e.g. "Rejected: insufficient balance".
    details: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // createdAt acts as the timestamp of the action. We don't need updatedAt
    // because logs are never modified after creation.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);

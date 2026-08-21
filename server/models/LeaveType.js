const mongoose = require('mongoose');

/**
 * LeaveType model
 * ----------------
 * Defines the kinds of leave the organization offers (e.g. Casual, Sick,
 * Earned) and how many days of each an employee gets per year.
 *
 * HR manages these. When a new employee is created, HR (or the system) uses
 * these types and their annualQuota to set up that employee's LeaveBalances.
 */
const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      unique: true,          // 'Casual', 'Sick' etc. should not repeat
      trim: true,
    },
    annualQuota: {
      type: Number,
      required: [true, 'Annual quota is required'],
      min: [0, 'Quota cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);

# Leave Management System (LMS)
## Edge Cases Handled & Exception Handling Guide

---

## 1. Exception & Error Handling Architecture

The Leave Management System implements an enterprise-grade, multi-tiered error handling pipeline spanning from database validation hooks up to the React frontend UI.

```
+-----------------------------------------------------------------------------------+
|                        EXCEPTION HANDLING PIPELINE                                |
+-----------------------------------------------------------------------------------+

[ Client React / Axios ]
        ^
        | Standard JSON { success: false, message: "..." }
        |
[ Express Global errorHandler ] <--- (Catch-all for all routes: 4 params)
        ^
        | next(err)
        |
[ serviceHandler / asyncHandler ] <--- Catches async Promise rejections
        ^
        | throws Error with err.statusCode
        |
[ Service Layer: createError ] <--- Domain rule failures (400, 403, 404)
        ^
        |
[ Mongoose Schema Validation ] <--- CastError, ValidationError, Duplicate key (11000)
```

### Key Error Handling Mechanisms:
1. **`createError(message, statusCode)`**:
   Utility (`server/utils/createError.js`) allowing services to throw domain exceptions that inherently specify their HTTP status code without binding business logic directly to `res.status()`.
2. **`assertValidId(id, label)`**:
   Pre-validates MongoDB ObjectIDs using `mongoose.Types.ObjectId.isValid()`. If an attacker passes `/api/leave/cancel/abc`, the system cleanly throws 400 Bad Request instead of triggering an unhandled Mongoose `CastError` (which would otherwise produce a 500 Internal Server Error).
3. **`asyncHandler` & `serviceHandler`**:
   Wraps all asynchronous controller functions to eliminate repetitive `try/catch` boilerplate, automatically routing rejected promises directly into Express's `next(err)`.
4. **Centralized `errorHandler` Middleware (`server/middleware/errorHandler.js`)**:
   Standardizes all outgoing error payloads to `{ success: false, message: err.message, stack: ... }`. Stack traces are strictly suppressed when `NODE_ENV === 'production'`.
5. **Process-Level Safety Nets (`server/server.js`)**:
   Listens for `unhandledRejection` and `uncaughtException`, logging fatal errors and gracefully shutting down the HTTP listener to prevent corrupted process states.
6. **Frontend Axios Interceptors (`client/src/api/axios.js`)**:
   Intercepts 401 Unauthorized responses to purge corrupted or expired tokens from `localStorage` and smoothly redirect users to `/login`.

---

## 2. Comprehensive Edge Cases Handled (16 Critical Scenarios)

### Edge Case 1: Insufficient Balance with "Pending Commitment" Hold
- **Scenario**: An employee has 5 days of Casual Leave remaining. They apply for 3 days (Request A, PENDING). Five minutes later, they try applying for 4 days (Request B). Individually, Request B is $\le 5$, but combined ($3 + 4 = 7$) exceeds the quota.
- **How It's Handled**: In `server/services/leaveService.js` (`getAvailableDays`):
  ```javascript
  const pending = await LeaveRequest.aggregate([
    { $match: { employee: userId, leaveType: leaveTypeId, status: 'PENDING' } },
    { $group: { _id: null, totalPendingDays: { $sum: '$days' } } }
  ]);
  const available = (balance.total - balance.used) - pendingDays;
  if (days > available) throw createError('Insufficient balance...', 400);
  ```
- **Outcome**: Request B is rejected immediately with HTTP 400.

---

### Edge Case 2: Inverted Date Range (`endDate < startDate`)
- **Scenario**: A user enters Start Date: `2026-10-15` and End Date: `2026-10-10`.
- **How It's Handled**: Handled at both the frontend date picker and enforced at the database level in `server/models/LeaveRequest.js`:
  ```javascript
  leaveRequestSchema.pre('validate', function (next) {
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      return next(new Error('End date cannot be before start date'));
    }
    next();
  });
  ```
- **Outcome**: The Mongoose `pre('validate')` hook rejects the document before writing to the database.

---

### Edge Case 3: Zero-Day or Sub-Day Leave Request
- **Scenario**: An employee submits a range resulting in 0 days or negative values.
- **How It's Handled**: In `server/utils/calculateLeaveDays.js`, dates are normalized to midnight and calculated inclusively ($+1$). In `leaveService.js`:
  ```javascript
  if (days < 1) throw createError('Leave must be at least 1 day', 400);
  ```
- **Outcome**: Rejects zero-length leaves with HTTP 400.

---

### Edge Case 4: Cancelling an Already Approved or Rejected Request
- **Scenario**: An employee's leave has already been approved, but they try to hit `DELETE /api/leave/cancel/:id` to revert it.
- **How It's Handled**: In `server/services/leaveService.js`:
  ```javascript
  if (request.status !== 'PENDING') {
    throw createError(`Cannot cancel a request that is already ${request.status}`, 400);
  }
  ```
- **Outcome**: Only strictly `PENDING` requests can be cancelled. Approved requests require manager intervention, preserving audit accuracy.

---

### Edge Case 5: Unauthorized Cancellation (Ownership Check)
- **Scenario**: Employee A discovers the `_id` of Employee B's leave request and sends a cancellation request.
- **How It's Handled**: In `server/services/leaveService.js`:
  ```javascript
  if (String(request.employee) !== String(userId)) {
    throw createError('You can only cancel your own requests', 403);
  }
  ```
- **Outcome**: Blocked with HTTP 403 Forbidden.

---

### Edge Case 6: Manager Acting on Non-Team Requests
- **Scenario**: Manager X attempts to approve or reject a request belonging to Employee Y, who reports to Manager Z.
- **How It's Handled**: In `server/services/leaveService.js`:
  ```javascript
  if (reviewer.role === 'manager' && String(request.employee.manager) !== String(reviewerId)) {
    throw createError('You can only approve requests from your own team', 403);
  }
  ```
- **Outcome**: Blocked with HTTP 403 Forbidden.

---

### Edge Case 7: Double Approval / Decision Race Condition
- **Scenario**: A manager double-clicks "Approve" or both HR and Manager act on the same request concurrently.
- **How It's Handled**: In `server/services/leaveService.js`:
  ```javascript
  if (request.status !== 'PENDING') {
    throw createError(`Only PENDING requests can be approved (this is ${request.status})`, 400);
  }
  ```
- **Outcome**: The first request succeeds; the second receives a clean 400 Bad Request stating the request is no longer pending.

---

### Edge Case 8: Balance Exhaustion at Decision Time
- **Scenario**: Between the time an employee submitted a request and the manager reviews it, another manual balance adjustment lowered their quota.
- **How It's Handled**: Before executing deduction in `approveLeaveRequest`:
  ```javascript
  if (!balance || (balance.total - balance.used) < request.days) {
    throw createError('Employee no longer has sufficient balance to approve', 400);
  }
  ```
- **Outcome**: Prevents balances from ever becoming negative.

---

### Edge Case 9: HR Self-Deactivation Guard
- **Scenario**: The sole HR administrator accidentally deactivates their own user account, which would lock everyone out of administrative functions.
- **How It's Handled**: In `server/services/userService.js`:
  ```javascript
  if (String(actorUser._id) === String(targetUserId) && isActive === false) {
    throw createError('HR administrators cannot deactivate their own account', 400);
  }
  ```
- **Outcome**: Blocked with HTTP 400.

---

### Edge Case 10: HR Self-Demotion Guard
- **Scenario**: An HR administrator edits their own profile and accidentally changes their role to `'employee'`.
- **How It's Handled**: In `server/services/userService.js`:
  ```javascript
  if (String(actorUser._id) === String(targetUserId) && role && role !== 'hr') {
    throw createError('HR administrators cannot remove their own HR role', 400);
  }
  ```
- **Outcome**: Blocked with HTTP 400.

---

### Edge Case 11: Referential Integrity on Leave Type Deletion
- **Scenario**: HR tries to delete "Casual Leave" policy while existing historical leave requests reference it.
- **How It's Handled**: In `server/services/leaveTypeService.js`:
  ```javascript
  const requestsUsingType = await LeaveRequest.countDocuments({ leaveType: id });
  if (requestsUsingType > 0) {
    throw createError(`Cannot delete leave type: ${requestsUsingType} request(s) are using it`, 400);
  }
  ```
- **Outcome**: Blocked with HTTP 400, preventing foreign-key orphan bugs in MongoDB.

---

### Edge Case 12: Case-Insensitive Duplicate Policy Names
- **Scenario**: HR tries to create a new leave type named `"casual leave"` when `"Casual Leave"` already exists.
- **How It's Handled**: In `server/services/leaveTypeService.js`:
  ```javascript
  const duplicate = await LeaveType.findOne({ name: String(name).trim() })
    .collation({ locale: 'en', strength: 2 });
  if (duplicate) throw createError('A leave type with this name already exists', 400);
  ```
- **Outcome**: Caught and rejected cleanly.

---

### Edge Case 13: Quota Reduction Protection
- **Scenario**: HR lowers Sick Leave quota from 10 days to 3 days, but Employee Jane has already used 5 days.
- **How It's Handled**: In `server/services/leaveTypeService.js`:
  ```javascript
  // Quota cannot be forced lower than what the employee has already consumed
  const newTotal = Math.max(type.annualQuota, balance.used);
  ```
- **Outcome**: The balance's `used` amount is preserved and `total` is clamped, preventing negative remaining values.

---

### Edge Case 14: Immediate Invalidation of Deactivated Users
- **Scenario**: An employee is terminated and deactivated by HR, but their JWT is still valid for 5 days.
- **How It's Handled**: In `server/middleware/authMiddleware.js`:
  ```javascript
  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is deactivated' });
  }
  ```
- **Outcome**: The deactivated user is blocked on their next API call despite possessing a valid cryptographic JWT.

---

### Edge Case 15: Malformed MongoDB ObjectIDs
- **Scenario**: A malicious or faulty client requests `/api/users/99999` or `/api/leave/cancel/invalid-id`.
- **How It's Handled**: In `server/utils/createError.js` (`assertValidId`):
  ```javascript
  const assertValidId = (id, label = 'id') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(`Invalid ${label}`, 400);
    }
  };
  ```
- **Outcome**: Returns clean 400 Bad Request instead of internal server crash (500).

---

### Edge Case 16: Atomic Batch Allocation ($O(1)$ Database Calls)
- **Scenario**: Creating a new leave type for an organization with 5,000 employees. Running a loop with `LeaveBalance.create()` would trigger 5,000 queries and timeout the HTTP request.
- **How It's Handled**: In `server/services/balanceService.js`:
  ```javascript
  const ops = users.map((u) => ({
    updateOne: {
      filter: { user: u._id, leaveType: typeId },
      update: { $setOnInsert: { total: quota, used: 0 } },
      upsert: true,
    },
  }));
  await LeaveBalance.bulkWrite(ops);
  ```
- **Outcome**: Executes in a single batch round-trip, preventing connection pool exhaustion.

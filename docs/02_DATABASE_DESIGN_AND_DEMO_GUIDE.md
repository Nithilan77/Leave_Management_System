# Leave Management System (LMS)
## Database Design & Live Demonstration Guide

---

## 1. Database Overview & Technology Stack

The Leave Management System utilizes **MongoDB** as its primary database, interfaced via the **Mongoose ODM (Object Data Modeling)** library in Node.js.

### Why MongoDB (NoSQL) for LMS?
1. **Document-Oriented Flexibility**: Leave applications and user profiles naturally map to JSON-like documents (`BSON`).
2. **Schema Enforcement with Mongoose**: While MongoDB is schema-less by nature, Mongoose enforces strict schema definitions, data types, default values, validations, and lifecycle hooks (`pre('validate')`, `pre('save')`).
3. **Powerful Aggregation Pipeline**: Advanced HR analytics (monthly trends, department breakdown, leave type distribution) are computed natively within the database engine via `$match`, `$group`, `$project`, and `$lookup`, avoiding in-memory array manipulation in Node.js.
4. **Cloud Managed & Resilient**: Deployed on **MongoDB Atlas**, offering high availability, automated backups, and global clustering.

---

## 2. Data Model & Collection Schemas (5 Collections)

The database schema is cleanly normalized into **5 core collections** to avoid unbound array growth, prevent concurrency write collisions, and guarantee audit trail integrity.

```
+-----------------------------------------------------------------+
|                       DATABASE ARCHITECTURE                     |
+-----------------------------------------------------------------+

     [ User ] (Self-referencing: manager -> User._id)
        |
        | 1:N
        +-----------------------+
        |                       |
        v                       v
  [ LeaveBalance ]        [ LeaveRequest ] <-------- [ LeaveType ]
  (user + leaveType)      (employee, leaveType)      (Policy definitions)
        ^                       |
        | (Deducts balance)     | 1:N
        +-----------------------+
                                v
                           [ AuditLog ]
                     (Immutable state history)
```

---

### Collection 1: `users` (`User.js`)
Stores all organizational members across the three roles (`employee`, `manager`, `hr`).

| Field | Type | Constraints & Modifiers | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated PK | Unique identifier |
| `name` | `String` | `required`, `trim` | Full employee name |
| `email` | `String` | `required`, `unique`, `lowercase`, `trim` | Corporate email used for login |
| `password` | `String` | `required`, `minlength: 6`, `select: false` | Bcrypt hashed password (10 salt rounds) |
| `role` | `String` | `enum: ['employee', 'manager', 'hr']`, `default: 'employee'` | Access control role |
| `department` | `String` | `required`, `trim` | Department (Engineering, Sales, etc.) |
| `manager` | `ObjectId` | `ref: 'User'`, `default: null` | Self-reference pointing to supervisor |
| `isActive` | `Boolean` | `default: true` | Soft-delete flag (prevents orphaned records) |
| `createdAt` / `updatedAt` | `Date` | Managed via `{ timestamps: true }` | Audit timestamps |

#### Critical Mongoose Hooks & Methods:
- **`pre('save')` Password Hashing**:
  ```javascript
  userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });
  ```
- **Password Exclusion**: `select: false` ensures `password` is never leaked in queries (`User.find()`) unless explicitly requested with `.select('+password')`.
- **`comparePassword(candidatePassword)`**: Encapsulated bcrypt comparison helper.

---

### Collection 2: `leavetypes` (`LeaveType.js`)
Defines company leave policies and annual allowances.

| Field | Type | Constraints & Modifiers | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated PK | Unique identifier |
| `name` | `String` | `required`, `trim` | Leave name (Casual, Sick, Annual, Maternity) |
| `annualQuota` | `Number` | `required`, `min: 0` | Allotted days per calendar year |
| `description` | `String` | `trim`, `default: ''` | Policy details / eligibility rules |
| `createdAt` / `updatedAt` | `Date` | `{ timestamps: true }` | Timestamp metadata |

#### Schema Features:
- **Case-Insensitive Uniqueness**: `leaveTypeService.js` prevents duplicates using collation queries (`{ locale: 'en', strength: 2 }`), preventing "sick" vs "Sick".
- **Referential Guard**: A `LeaveType` cannot be deleted if any `LeaveRequest` references it.

---

### Collection 3: `leavebalances` (`LeaveBalance.js`)
Tracks the specific quota allocation and usage for a given employee and leave type.

| Field | Type | Constraints & Modifiers | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated PK | Unique balance record ID |
| `user` | `ObjectId` | `ref: 'User'`, `required: true` | Employee reference |
| `leaveType` | `ObjectId` | `ref: 'LeaveType'`, `required: true` | Policy type reference |
| `total` | `Number` | `required: true`, `min: 0` | Total allotted days for the year |
| `used` | `Number` | `default: 0`, `min: 0` | Days consumed through approved requests |
| `remaining` | `Virtual` | `total - used` | Computed dynamically (never stored) |

#### Schema Features:
- **Compound Unique Index**:
  ```javascript
  leaveBalanceSchema.index({ user: 1, leaveType: 1 }, { unique: true });
  ```
  Guarantees that a user can never have more than one balance record per leave type.
- **Dynamic Virtual Field**:
  ```javascript
  leaveBalanceSchema.virtual('remaining').get(function () {
    return this.total - this.used;
  });
  leaveBalanceSchema.set('toJSON', { virtuals: true });
  ```
  Eliminates data drift bugs where `remaining` could disagree with `total - used`.

---

### Collection 4: `leaverequests` (`LeaveRequest.js`)
Represents an individual leave application and its transition through the approval lifecycle.

| Field | Type | Constraints & Modifiers | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated PK | Unique leave request ID |
| `employee` | `ObjectId` | `ref: 'User'`, `required: true` | Request applicant |
| `leaveType` | `ObjectId` | `ref: 'LeaveType'`, `required: true` | Applied leave category |
| `startDate` | `Date` | `required: true` | Leave start date |
| `endDate` | `Date` | `required: true` | Leave end date |
| `days` | `Number` | `required: true`, `min: 1` | Calculated duration (inclusive) |
| `reason` | `String` | `required: true`, `trim` | Reason submitted by employee |
| `status` | `String` | `enum: ['PENDING','APPROVED','REJECTED','CANCELLED','ESCALATED']` | Workflow status (default: PENDING) |
| `reviewedBy` | `ObjectId` | `ref: 'User'`, `default: null` | Approving Manager or HR |
| `reviewComment` | `String` | `trim`, `default: ''` | Feedback / reason for rejection |

#### Schema Features:
- **Pre-Validate Date Guard**:
  ```javascript
  leaveRequestSchema.pre('validate', function (next) {
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      return next(new Error('End date cannot be before start date'));
    }
    next();
  });
  ```

---

### Collection 5: `auditlogs` (`AuditLog.js`)
An append-only, immutable transaction ledger capturing every lifecycle event.

| Field | Type | Constraints & Modifiers | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated PK | Audit entry ID |
| `request` | `ObjectId` | `ref: 'LeaveRequest'`, `required: true` | Associated leave request |
| `action` | `String` | `enum: ['CREATED','APPROVED','REJECTED','CANCELLED','ESCALATED']` | Transition event |
| `performedBy` | `ObjectId` | `ref: 'User'`, `required: true` | Actor (Employee, Manager, HR) |
| `timestamp` | `Date` | `default: Date.now` | Exact event timestamp |
| `details` | `String` | `trim`, `default: ''` | Contextual notes (e.g., rejection reason) |

---

## 3. Database Design Justification: Normalization vs Denormalization

| Design Aspect | Chosen Approach | Academic & Architectural Rationale |
|---|---|---|
| **User & Manager** | Normalized Self-Reference (`manager: ObjectId -> User`) | Avoids duplicating manager details across employees; when manager details update, no cascade updates are required. |
| **Balances vs User Document** | Separate Collection (`LeaveBalance`) | Embedding balances inside `User` violates Single Responsibility and risks document bloating or concurrency locks when multiple balance operations occur. |
| **Leave Requests vs User** | Separate Collection (`LeaveRequest`) | In an enterprise, an employee can have dozens of leave requests over years. Embedding arrays in `User` would hit MongoDB's 16MB document limit and slow down simple auth lookups. |
| **Audit Log** | Independent Immutable Collection | Audit logs must never be updated or deleted. Keeping them separate guarantees tamper resistance and allows high-performance independent pagination. |

---

## 4. How to Show & Demonstrate the Database in Viva / Demo

During the evaluation, examiners look for evidence that your frontend actions actually translate to precise database mutations.

### Recommended Demo Setup
1. Open **MongoDB Compass** (or MongoDB Atlas Web Dashboard) side-by-side with the web browser.
2. Filter the `users` collection to locate the test employee:
   ```json
   { "email": "employee@example.com" }
   ```
   *Copy their `_id`*.

---

### Demo Step 1: Pre-Application Baseline Check
In MongoDB Compass, navigate to `leavebalances`:
Filter:
```json
{ "user": ObjectId("PUT_EMPLOYEE_ID_HERE") }
```
**Show the Examiner**:
- `total`: 12
- `used`: 0
- Virtual `remaining`: 12

---

### Demo Step 2: Employee Submits Leave Request (2 Days)
In the browser, log in as Employee and apply for 2 days of Casual Leave.
Now switch to Compass:
1. Open `leaverequests`:
   ```json
   { "employee": ObjectId("PUT_EMPLOYEE_ID_HERE") }
   ```
   **Point out**:
   - `status`: `"PENDING"`
   - `days`: `2`
   - `reviewedBy`: `null`
2. Open `auditlogs`:
   ```json
   { "performedBy": ObjectId("PUT_EMPLOYEE_ID_HERE") }
   ```
   **Point out**: A new record with `action: "CREATED"` and `details: "Applied for 2 day(s) of Casual Leave"`.
3. Open `leavebalances`:
   **Point out**: `used` is **STILL 0**!
   *Viva explanation*: "Sir, notice that the balance is NOT deducted upon submission. It remains pending. However, our `getAvailableDays` business logic calculates `remaining - pendingDays` so the employee cannot submit another conflicting request!"

---

### Demo Step 3: Manager Approves the Request
In the browser, log in as the Manager and click **Approve** with comment `"Approved, enjoy your vacation!"`.
Now switch to Compass:
1. Refresh `leaverequests`:
   - `status` transitioned to `"APPROVED"`.
   - `reviewedBy` is now set to Manager's `_id`.
   - `reviewComment` updated to `"Approved, enjoy your vacation!"`.
2. Refresh `leavebalances`:
   - `used` has atomically updated from `0` -> `2`!
   - Virtual `remaining` is now `10`.
3. Refresh `auditlogs`:
   - A new immutable entry with `action: "APPROVED"` and `performedBy: Manager._id`.

---

### Demo Step 4: Demonstrating Referential Integrity & Defensive Guards
1. Log in as HR and try to delete a Leave Type that is used by this request.
2. The UI blocks it with `"Cannot delete leave type: X request(s) are using it"`.
3. In Compass, show that no orphan documents were created.

---

## 5. MongoDB Aggregation Pipeline Showcase (HR Analytics)

When showing the HR Reports tab in the browser, explain to faculty how the backend query operates in `reportService.js`:

```javascript
// Native aggregation in MongoDB engine (not in Node.js RAM)
const summary = await LeaveRequest.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);

const approvedDays = await LeaveRequest.aggregate([
  { $match: { status: 'APPROVED' } },
  { $group: { _id: null, days: { $sum: '$days' } } }
]);
```
*Key Viva point*: "We offloaded data processing to MongoDB's C++ aggregation engine using indexes, ensuring $O(1)$ memory consumption in our Node.js server even with thousands of employees."

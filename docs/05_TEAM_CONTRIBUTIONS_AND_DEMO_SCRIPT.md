# Leave Management System (LMS)
## Team Ownership Breakdown & End-to-End Live Demo Script

---

## 1. Team Ownership Split (Mapped to Project Blueprint)

As established in the `Leave_Management_System_Blueprint.docx`, our 3-member team divided the application into complete vertical slices (from frontend to backend), ensuring each person has deep domain ownership while understanding the full system:

```
+-------------------------------------------------------------------------------------------------+
|                                     TEAM OWNERSHIP MATRIX                                       |
+-------------------------------------------------------------------------------------------------+
| Member   | Primary Ownership Area           | End-to-End Code & Architectural Scope             |
+----------+----------------------------------+---------------------------------------------------+
| Nithilan | Auth + Employee Vertical + Spine | - Architecture, server.js, app.js, DB models      |
|          |                                  | - JWT Auth, bcrypt, protect & authorize RBAC     |
|          |                                  | - Employee flow: apply, balances, cancel          |
|          |                                  | - ApplyLeave.jsx, Dashboard.jsx, MyRequests.jsx   |
+----------+----------------------------------+---------------------------------------------------+
| Muskan   | Manager Vertical + Workflow      | - Manager approval/rejection queue backend        |
|          |                                  | - Workflow logic: approve/reject, balance deduct  |
|          |                                  | - Team boundaries (manager reporting check)       |
|          |                                  | - ApprovalQueue.jsx frontend, modals, audit logs  |
+----------+----------------------------------+---------------------------------------------------+
| Mohnish  | HR/Admin + Reporting + DevOps    | - User management & RBAC assignment backend/UI    |
|          |                                  | - Leave policy management & quota propagation     |
|          |                                  | - MongoDB aggregation pipelines, Reports.jsx, CSV |
|          |                                  | - Docker, docker-compose, Swagger UI, CI pipeline |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Individual Contributions & Code Mapping

### Nithilan — Lead Architect, Authentication & Employee Vertical
- **Backend Infrastructure**:
  - `server/server.js` & `server/app.js`: Server lifecycle, route registration, graceful shutdown.
  - `server/config/db.js`: Resilient MongoDB Atlas connection logic.
  - `server/models/`: Designed all 5 Mongoose schemas (`User`, `LeaveType`, `LeaveBalance`, `LeaveRequest`, `AuditLog`), including compound unique indexes, dynamic virtual properties (`remaining`), and schema lifecycle hooks.
  - `server/middleware/authMiddleware.js`: Implemented `protect` (JWT extraction and verification) and `authorize` (Role-Based Access Control).
  - `server/utils/generateToken.js`: Cryptographic token issuance.
  - `server/seed.js`: Database seeding script for demo data.
- **Employee Vertical**:
  - `server/services/leaveService.js`: Implemented `applyForLeave`, `getAvailableDays` (preventing over-subscription during pending requests), `getMyLeaveRequests`, `getMyBalances`, and `cancelLeaveRequest`.
  - `server/controllers/leaveController.js` & `server/routes/leaveRoutes.js`: REST endpoints for employee interactions.
- **Frontend**:
  - `client/src/App.jsx` & `client/src/components/ProtectedRoute.jsx`: Client-side route guards.
  - `client/src/api/axios.js`: Axios instance with Bearer token injection and 401 interception.
  - `client/src/store/slices/authSlice.js`: Redux authentication state.
  - `client/src/pages/Login.jsx`: Login UI with demo credentials autofill.
  - `client/src/pages/Dashboard.jsx`: Employee KPI balance cards and overview.
  - `client/src/pages/ApplyLeave.jsx`: Interactive application form with dynamic day calculation.
  - `client/src/pages/MyRequests.jsx`: Request tracking table with cancellation handling.

---

### Muskan — Manager Vertical & Workflow Engine
- **Backend & Workflow Engine**:
  - `server/controllers/managerController.js` & `server/routes/managerRoutes.js`: Dedicated routes for manager approval queue (`/api/manager/requests`), team history, and action handlers.
  - `server/services/leaveService.js` (Workflow Core):
    - `getTeamRequests`: Queries direct reports using `{ manager: managerId }`.
    - `approveLeaveRequest`: Verifies manager authority over employee, performs atomic balance deduction (`balance.used += days`), transitions status to `APPROVED`, and logs audit trail.
    - `rejectLeaveRequest`: Validates team relationship, requires review comment, transitions status to `REJECTED`, and records audit trail.
  - Security Boundary Enforcement: Enforced that managers cannot view or act on requests from employees outside their department/reporting chain.
- **Frontend**:
  - `client/src/pages/manager/ApprovalQueue.jsx`: Built the Manager review dashboard displaying pending employee requests, date ranges, and days calculation.
  - Modal Integration: Built confirmation dialogs for Approval and mandatory comment entry for Rejections.
  - `client/src/components/managerNav.js`: Manager navigation configuration.
- **Testing**:
  - Authored comprehensive test suites: `tests/leaveService.manager.unit.test.js`, `tests/managerController.unit.test.js`, and `tests/manager.flow.test.js` verifying the complete approval lifecycle.

---

### Mohnish — HR/Admin Vertical, Reporting & DevOps
- **HR Backend & Services**:
  - `server/services/userService.js` & `server/controllers/userController.js`: Full CRUD operations for users, role promotion/demotion, manager assignment, password resets, and soft deactivation with self-deactivation protection.
  - `server/services/leaveTypeService.js` & `server/controllers/leaveTypeController.js`: Policy creation, case-insensitive duplicate prevention, quota updates, and deletion safety guards.
  - `server/services/balanceService.js`: High-performance batch allocation using MongoDB `bulkWrite` for organization-wide quota initialization.
  - `server/services/reportService.js`: Advanced MongoDB aggregation pipelines (`$match`, `$group`, `$project`, `$lookup`) computing headline KPIs, monthly trends, department usage, and paginated audit logs.
  - CSV Export Engine: Streamed leave data export.
- **Frontend**:
  - `client/src/pages/hr/HRDashboard.jsx`: High-level organizational KPI cards.
  - `client/src/pages/hr/ManageUsers.jsx`: Interactive user directory with modal management.
  - `client/src/pages/hr/LeaveTypes.jsx`: Policy configuration portal.
  - `client/src/pages/hr/Reports.jsx`: Chart visualizations, CSV export button, and audit ledger browser.
- **DevOps & Architecture**:
  - Dockerization: Created multi-stage `Dockerfile` for client and server, and `docker-compose.yml` for unified local container runs.
  - `server/config/swagger.js`: OpenAPI 3.0 documentation for all 30+ endpoints.
  - CI/CD: `.github/workflows/ci.yml` running automated testing on every push.

---

## 3. Minute-by-Minute End-to-End Live Demo Script

| Time | Presenter | Action / Screen Shown | Talking Points (Word-for-Word Guide) |
|---|---|---|---|
| **0:00 - 1:30** | **Nithilan** | Architecture Slide / Swagger UI | "Good morning, respected faculty. Today our team presents the Leave Management System. Our application is built on a 3-tier MERN stack with strict Role-Based Access Control across three distinct personas: Employee, Manager, and HR. Every business rule is isolated in a testable Service Layer, and every state change produces an immutable audit trail." |
| **1:30 - 3:30** | **Nithilan** | Browser: Login -> Employee Dashboard -> Apply Leave | "I will demonstrate the Employee vertical. I log in as John Doe (`employee@example.com`). Notice the dynamic dashboard displaying my current balances: 12 days Casual Leave. I navigate to 'Apply Leave' and select Casual Leave from Oct 15 to Oct 16. The frontend automatically computes 2 calendar days. When I submit, the backend executes `getAvailableDays`, validating that my available quota accommodates this request after accounting for other pending leaves. The request is submitted in `PENDING` state." |
| **3:30 - 4:15** | **Nithilan** | MongoDB Compass | "Switching to MongoDB Compass, notice that in `leavebalances`, `used` is still 0 because the leave is not yet approved. In `leaverequests`, a new record exists with `status: 'PENDING'`. And in `auditlogs`, an immutable entry records that John Doe created this request." |
| **4:15 - 6:30** | **Muskan** | Browser: Manager Login -> Approval Queue | "Now I log in as Sarah Jenkins (`manager@example.com`), John's reporting manager. As a manager, my navigation is customized to my role. In my 'Approval Queue', John's request appears immediately. Notice that if another employee from a different team applied, they would not appear here because our backend enforces `{ manager: req.user._id }`. I review the reason and click 'Approve', providing a review comment: 'Approved, enjoy your break!'" |
| **6:30 - 7:30** | **Muskan** | MongoDB Compass | "Now in MongoDB Compass, let us refresh the `leavebalances` collection. You can see that `used` has atomically updated from 0 to 2, and the dynamic virtual `remaining` is now 10! In `leaverequests`, the status is `APPROVED` and `reviewedBy` points to Sarah. A second immutable entry is written to `auditlogs`." |
| **7:30 - 9:30** | **Mohnish** | Browser: HR Login -> HR Dashboard & Reports | "Now I log in as the HR Administrator (`hr@example.com`). The HR dashboard provides enterprise visibility. In 'Manage Users', HR can assign managers, update roles, or deactivate accounts with defensive guards preventing HR from deactivating themselves. In 'Leave Policy', HR can adjust annual quotas and automatically propagate them across all employee balances using MongoDB `bulkWrite`. In 'Reports', our system runs MongoDB aggregation pipelines to display monthly leave distribution and department metrics. HR can also export the full report as a CSV file and audit the complete history of all actions." |
| **9:30 - 10:30** | **Mohnish** | Terminal / Swagger / Docker | "Finally, looking under the hood: our application is completely containerized via Docker and Docker Compose. We have documented all 30+ endpoints using OpenAPI 3.0 Swagger UI, and our automated CI/CD pipeline runs 80 unit and integration tests on every GitHub commit." |

---

## 4. Expected Viva Questions & Model Answers by Role

### Questions for Nithilan:
1. **Q: Why did you separate `server.js` and `app.js`?**
   - **Answer**: "Separating `app.js` from `server.js` decouples Express configuration from the HTTP network listener. This allows our test suite (Supertest) to import the Express application directly and execute fast in-memory HTTP integration tests without having to start a real server or bind to a network port."
2. **Q: How does your JWT authentication work, and why is authorization checked on the server?**
   - **Answer**: "When a user logs in, we generate a signed JWT with `id` and `role`. On subsequent requests, the `protect` middleware verifies the cryptographic signature and checks that the user still exists and is active. The `authorize` middleware checks if `req.user.role` has permission for that route. We never rely on the frontend for security because anyone can bypass the UI and make direct HTTP requests using tools like Postman or curl."
3. **Q: How do you prevent an employee from submitting multiple pending requests that exceed their quota?**
   - **Answer**: "In `leaveService.js`, the `getAvailableDays` function aggregates the sum of days across all existing `PENDING` requests for that leave type and subtracts it from `remaining`. This guarantees that committed pending requests hold quota before approval."

### Questions for Muskan:
1. **Q: How do you ensure a manager cannot approve a leave request for an employee from another department?**
   - **Answer**: "In `approveLeaveRequest`, we populate the employee's `manager` field from the database. If `reviewer.role === 'manager'`, we assert that `String(request.employee.manager) === String(reviewerId)`. If they do not match, we throw a 403 Forbidden error. This is enforced at the database level, not in the frontend."
2. **Q: What happens if two managers attempt to approve the same request simultaneously?**
   - **Answer**: "Our approval logic checks `if (request.status !== 'PENDING') throw createError(..., 400)`. Once the first request transitions the status to `APPROVED`, any concurrent or subsequent request fails immediately."
3. **Q: Why don't you deduct the leave balance when the employee applies?**
   - **Answer**: "Because if the request is subsequently rejected or cancelled, we would have to implement reverse compensation logic to refund days. By holding quota virtually during pending status and only executing atomic deduction (`balance.used += days`) upon approval, we ensure database consistency."

### Questions for Mohnish:
1. **Q: Why did you use MongoDB aggregation pipelines instead of JavaScript `.filter()` and `.reduce()` in Node.js?**
   - **Answer**: "Processing large datasets in Node.js would load thousands of documents into server RAM, causing memory bloat and blocking Node's single-threaded event loop. MongoDB's aggregation pipeline (`$group`, `$match`, `$lookup`) executes natively in C++ on the database engine using indexes, returning only the final computed aggregate numbers."
2. **Q: How does `bulkWrite` optimize creating a new leave type for all employees?**
   - **Answer**: "If we used a `for` loop with `LeaveBalance.create()`, allocating a new policy to 1,000 employees would require 1,000 separate network round-trips to the database. With `bulkWrite`, we send a single batch command over one network connection, reducing latency from seconds to milliseconds."
3. **Q: How is Docker configured for this application?**
   - **Answer**: "We have a multi-stage `Dockerfile` for the client that builds the production React bundle and serves it via Nginx, and a Node.js `Dockerfile` for the API. `docker-compose.yml` connects the client, API, and MongoDB containers on an isolated internal bridge network with environment variables injected securely."

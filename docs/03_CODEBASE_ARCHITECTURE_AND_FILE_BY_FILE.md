# Leave Management System (LMS)
## Codebase Architecture & Comprehensive File-by-File Guide

---

## 1. Tech Stack Justification

| Technology | Selection Rationale & Industry Defense |
|---|---|
| **React 18 + Vite** | **Blazing-Fast Build & Virtual DOM**: Vite uses native ES modules during development for sub-second HMR (Hot Module Replacement) and Rollup for optimal production bundling. React's component-based virtual DOM provides declarative UI rendering and instant responsive updates. |
| **Node.js + Express** | **High Throughput & Non-Blocking I/O**: Single-threaded event loop efficiently manages concurrent REST requests without thread starvation. Express provides lightweight, unopinionated middleware chaining (`authMiddleware`, `errorHandler`, `cors`). |
| **MongoDB Atlas + Mongoose** | **Schema Flexibility + Enterprise ODM**: JSON-native document model matches JavaScript object conventions. Mongoose introduces schema enforcement, validations, compound indexing (`user` + `leaveType`), dynamic virtuals (`remaining`), and lifecycle hooks (`pre-save`). |
| **JWT (JSON Web Token)** | **Stateless Authorization**: Eliminates server-side session stores (Redis/memory), allowing horizontal scaling. Tokens contain cryptographically signed claims (`id`, `role`) validated on each API request. |
| **Bcrypt.js** | **Cryptographic Password Security**: Implements salted hashing (10 salt rounds) with deliberate CPU cost, protecting credentials against brute-force and rainbow table attacks. |
| **Redux Toolkit (RTK)** | **Predictable Global State**: Manages authentication lifecycle, user session persistence across page refreshes, and centralized logout cleanup. |
| **Docker & Docker Compose** | **Environment Parity**: Ensures the entire multi-container stack (React frontend, Node API, MongoDB) runs identically on developer machines and cloud deployment servers without environment mismatches. |
| **Jest + Supertest** | **Isolated Automated Quality Assurance**: Jest combined with `mongodb-memory-server` executes unit and integration tests in an ephemeral in-memory database without polluting live data. |

---

## 2. Architectural Design: Layered 3-Tier Pattern

The backend strictly enforces the **Separation of Concerns (SoC)** principle:

```
[ HTTP Request: Client Axios ]
             |
             v
+------------------------------------+
| 1. ROUTE LAYER (routes/*.js)       | -> Maps URL + HTTP Verb + Middleware (protect, authorize)
+------------------------------------+
             |
             v
+------------------------------------+
| 2. CONTROLLER LAYER (controllers/) | -> Thin layer: parses req.body/params, status codes, delegates
+------------------------------------+
             |
             v
+------------------------------------+
| 3. SERVICE LAYER (services/*.js)   | -> Pure Business Rules (quotas, permissions, audit logging)
+------------------------------------+
             |
             v
+------------------------------------+
| 4. DATA ACCESS LAYER (models/*.js) | -> Mongoose schemas, hooks, indexes, validations
+------------------------------------+
             |
             v
[ MongoDB Atlas Database ]
```

---

## 3. Comprehensive File-by-File Walkthrough

### A. Server Core & Configuration

#### `server/server.js`
- **Role**: Application entry point and process lifecycle manager.
- **Functionality**: Loads environment variables (`dotenv`), initiates the database connection via `connectDB()`, and starts the HTTP server listening on `PORT` (default 5000) only **after** DB connection succeeds.
- **Error Handling**: Registers global process listeners for `unhandledRejection` and `uncaughtException` to cleanly shut down without dropping active socket connections.

#### `server/app.js`
- **Role**: Express application initialization and middleware orchestrator.
- **Functionality**: Configures `cors`, `express.json()`, HTTP request logging, Swagger UI route (`/api-docs`), and mounts all domain routes (`/api/auth`, `/api/leave`, `/api/manager`, `/api/users`, `/api/leave-types`, `/api/reports`).
- **Design Highlight**: Decoupled from `server.js` so test suites (`Supertest`) can import `app` directly without binding to a network port.

#### `server/config/db.js`
- **Role**: Database connection manager.
- **Functionality**: Uses `mongoose.connect(process.env.MONGO_URI)` with auto-retry and clear console logging on successful connection or fatal exit on failure.

#### `server/config/swagger.js`
- **Role**: API documentation engine.
- **Functionality**: Configures `swagger-jsdoc` and `swagger-ui-express` with OpenAPI 3.0 specifications, defining Bearer token auth security schemes and documenting all 30+ REST endpoints.

---

### B. Server Models (`server/models/`)

#### `server/models/User.js`
- **Role**: Defines identity, authentication credentials, and corporate hierarchy.
- **Key Fields**: `name`, `email` (unique, lowercase), `password` (`select: false`, bcrypt hashed), `role` (`'employee'|'manager'|'hr'`), `department`, `manager` (self-referencing `ObjectId -> User`), `isActive` (boolean for soft deletion).
- **Hooks**: `pre('save')` hashes updated passwords with salt rounds = 10. `comparePassword()` helper for login.

#### `server/models/LeaveType.js`
- **Role**: Master policy catalog for leave categories.
- **Key Fields**: `name` (unique case-insensitive), `annualQuota` (number $\ge 0$), `description`.

#### `server/models/LeaveBalance.js`
- **Role**: Tracks individual employee allocations per leave type.
- **Key Fields**: `user` (`ref: User`), `leaveType` (`ref: LeaveType`), `total` ($\ge 0$), `used` ($\ge 0$).
- **Indexes**: Compound unique index `{ user: 1, leaveType: 1 }` preventing duplicate balances.
- **Virtuals**: Dynamic `remaining` computed as `total - used`.

#### `server/models/LeaveRequest.js`
- **Role**: Core transaction entity tracking individual leave applications.
- **Key Fields**: `employee` (`ref: User`), `leaveType` (`ref: LeaveType`), `startDate`, `endDate`, `days` ($\ge 1$), `reason`, `status` (`'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'|'ESCALATED'`), `reviewedBy` (`ref: User`), `reviewComment`.
- **Hooks**: `pre('validate')` asserts `endDate >= startDate`.

#### `server/models/AuditLog.js`
- **Role**: Immutable regulatory ledger.
- **Key Fields**: `request` (`ref: LeaveRequest`), `action` (`CREATED|APPROVED|REJECTED|CANCELLED|ESCALATED`), `performedBy` (`ref: User`), `timestamp`, `details`. Append-only.

---

### C. Server Middleware & Utilities (`server/middleware/`, `server/utils/`)

#### `server/middleware/authMiddleware.js`
- **`protect`**: Extracts JWT from `Authorization: Bearer <token>`, verifies signature using `JWT_SECRET`, retrieves user from DB (excluding password), verifies `isActive === true`, and attaches `req.user`.
- **`authorize(...roles)`**: Higher-order middleware checking if `req.user.role` is in permitted list; returns 403 Forbidden otherwise.

#### `server/middleware/errorHandler.js`
- **`notFound`**: Catches unmatched routes, creating a 404 Error passed to `next()`.
- **`errorHandler`**: Express 4-parameter error sink. Extracts status code, sends `{ success: false, message: err.message }`, and hides stack traces in production.

#### `server/utils/asyncHandler.js` & `server/utils/serviceHandler.js`
- **Role**: Higher-order wrappers eliminating repetitive `try/catch` boilerplate in controllers. Catches rejected promises and transfers `err.statusCode` to HTTP response.

#### `server/utils/createError.js`
- **Role**: Constructs custom errors carrying HTTP status codes (`createError('Message', 400)`). Includes `assertValidId()` which catches malformed ObjectIDs before Mongoose throws 500 errors.

#### `server/utils/generateToken.js`
- **Role**: Signs JWT containing `{ id, role }` with configurable expiry (`JWT_EXPIRES_IN`, default 7d).

#### `server/utils/calculateLeaveDays.js`
- **Role**: Normalizes date timestamps to midnight and calculates inclusive calendar day count ($(\text{endDate} - \text{startDate}) + 1$).

---

### D. Server Services (Business Logic Layer: `server/services/`)

#### `server/services/leaveService.js` (Employee & Workflow Core)
- **Functions**:
  - `getAvailableDays(userId, leaveTypeId)`: Aggregates pending days of the same type and subtracts from `remaining` to prevent over-subscription.
  - `applyForLeave(userId, data)`: Validates dates, checks available balance, creates `LeaveRequest` (status: PENDING), and appends `AuditLog` entry.
  - `getMyLeaveRequests(userId)` & `getMyBalances(userId)`: Fetches employee-specific history and balances.
  - `cancelLeaveRequest(userId, requestId)`: Validates ownership and ensures status is strictly PENDING before cancellation.
  - `approveLeaveRequest(reviewer, requestId, comment)`: Validates manager team ownership, checks balance sufficiency, atomically increments `balance.used += days`, sets status to APPROVED, and writes audit record.
  - `rejectLeaveRequest(reviewer, requestId, comment)`: Validates manager team ownership, updates status to REJECTED, and records audit trail.

#### `server/services/userService.js` (HR User Management)
- **Functions**: Handles user creation with automatic leave balance initialization, updates, password resets, and soft deactivations (`isActive: false`). Enforces guards preventing HR self-deactivation or self-demotion.

#### `server/services/balanceService.js` (Balance Allocation)
- **Functions**: Allocates quotas across all users using MongoDB `bulkWrite` for $O(1)$ database round-trips, initializes individual balances, and supports manual balance overrides.

#### `server/services/leaveTypeService.js` (Policy Management)
- **Functions**: CRUD for leave policies. Enforces case-insensitive duplicate name checks, optional quota propagation to active user balances, and blocks deletion if active requests reference the type.

#### `server/services/reportService.js` (HR Analytics & Aggregations)
- **Functions**: Executes native MongoDB aggregation pipelines for headline KPIs, monthly approved leave trends, leave type distribution, department utilization, CSV export formatting, and paginated audit log browsing.

---

### E. Server Controllers & Routes (`controllers/` & `routes/`)

- **`authController.js` & `authRoutes.js`**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
- **`leaveController.js` & `leaveRoutes.js`**: `/api/leave/apply`, `/api/leave/my-requests`, `/api/leave/balances`, `/api/leave/cancel/:id`.
- **`managerController.js` & `managerRoutes.js`**: `/api/manager/requests` (pending team queue), `/api/manager/approve/:id`, `/api/manager/reject/:id`, `/api/manager/team-history`.
- **`userController.js` & `userRoutes.js`**: HR `/api/users` endpoints for CRUD, status toggling, and balance adjustment.
- **`leaveTypeController.js` & `leaveTypeRoutes.js`**: HR `/api/leave-types` policy management endpoints.
- **`reportController.js` & `reportRoutes.js`**: HR `/api/reports` endpoints for summary stats, charts, CSV download, and audit trails.

---

### F. Client Core & State Management (`client/src/`)

#### `client/src/main.jsx` & `client/src/App.jsx`
- **Role**: React root and client-side routing tree using `react-router-dom`.
- **Routing Structure**:
  - `/login`: Public login route.
  - Protected Employee Routes: `/` (Dashboard), `/apply-leave`, `/my-requests`.
  - Protected Manager Routes: `/manager/queue`.
  - Protected HR Routes: `/hr/dashboard`, `/hr/users`, `/hr/leave-types`, `/hr/reports`.

#### `client/src/api/axios.js`
- **Role**: Configured Axios instance with request/response interceptors.
- **Interceptors**: Automatically injects `Authorization: Bearer <token>` on every outgoing request. Listens for 401 Unauthorized responses to clear token and redirect to `/login`.

#### `client/src/store/store.js` & `client/src/store/slices/authSlice.js`
- **Role**: Redux store managing authentication state (`user`, `token`, `isAuthenticated`, `loading`). Persists token to `localStorage`.

---

### G. Client Components & Navigation (`client/src/components/`)

- **`Layout.jsx`**: Main application shell providing the responsive sidebar, user avatar, active role badge, and dynamic navigation links.
- **`ProtectedRoute.jsx`**: Route guard validating whether user is authenticated and possesses the required role; redirects unauthorized attempts to `/login` or `/`.
- **`employeeNav.js`, `managerNav.js`, `hrNav.js`**: Configuration manifests defining role-specific navigation menus and icons.
- **`ConfirmDialog.jsx`**: Modal component for destructive confirmation actions (rejections, cancellations, deactivations).

---

### H. Client Pages (`client/src/pages/`)

#### `client/src/pages/Login.jsx`
- Interactive login form with email/password validation, demo quick-fill buttons for each role, loading spinners, and error alerts.

#### `client/src/pages/Dashboard.jsx` (Employee View)
- Displays summary cards for total, used, and remaining balances per leave type, quick-action link to apply for leave, and recent application status timeline.

#### `client/src/pages/ApplyLeave.jsx`
- Leave application form with interactive date pickers, real-time day calculation, dynamic balance quota check, and reason field.

#### `client/src/pages/MyRequests.jsx`
- Table of employee leave requests with status badges (yellow PENDING, green APPROVED, red REJECTED) and one-click Cancel button for pending items.

#### `client/src/pages/manager/ApprovalQueue.jsx`
- Manager's review portal displaying team members' pending requests, duration, dates, reason, with Approve and Reject modals requiring review comments.

#### `client/src/pages/hr/HRDashboard.jsx`
- High-level executive overview cards (total employees, active requests, days taken this month, pending approvals).

#### `client/src/pages/hr/ManageUsers.jsx`
- Comprehensive user directory allowing HR to create users, assign managers, change roles, edit departments, reset passwords, and toggle active status.

#### `client/src/pages/hr/LeaveTypes.jsx`
- Interface to create and modify leave policies, configure annual quotas, and propagate changes across the organization.

#### `client/src/pages/hr/Reports.jsx`
- Enterprise analytics suite with monthly trend charts, leave breakdown visualizations, CSV export button, and searchable audit logs.

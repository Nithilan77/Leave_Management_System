# Leave Management System (LMS)
## SDLC Documentation · Functional and Non-Functional Requirements

---

## 1. SDLC Model Followed — Agile (Iterative)

We followed an Agile-inspired iterative model. Rather than building everything in one shot, we broke the system into three vertical "roles" (Employee, Manager, HR), built and tested each one before moving to the next, and integrated them at the end.

---

## 2. SDLC Phases

### Phase 1 — Planning and Requirements Gathering
- Identified stakeholders: Employee, Manager, HR/Admin
- Analyzed the problem: organizations use email + paper for leave — inefficient, error-prone, no audit trail
- Defined scope: who can do what, data needed, relationships
- Produced: Leave_Management_System_Blueprint.docx — single source of truth for roles, features, endpoints, data model
- Team responsibilities:
  - Nithilan — Employee vertical (apply, view balances, cancel), JWT auth, project foundation (app.js, middleware, seed, Docker, CI)
  - Muskan — Manager vertical (approval queue, approve/reject), ApprovalQueue.jsx
  - Mohnish — HR vertical (user management, leave types, reports, analytics)

---

### Phase 2 — System Design

#### High-Level Architecture
```
Browser (React SPA)
       |  REST / JSON over HTTPS
       v
Express API (Node.js)
   |-- routes/       -- URL + HTTP verb + middleware
   |-- controllers/  -- req/res glue (thin)
   |-- services/     -- ALL business logic
   |-- models/       -- Mongoose schemas + DB
       |  Mongoose ODM
       v
MongoDB Atlas (cloud NoSQL database)
```

#### Database Design (5 Collections)

| Collection | Purpose |
|---|---|
| users | All people in the system (3 roles via single schema) |
| leavetypes | Policy: what kinds of leave exist and how many days/year |
| leavebalances | Per user, per type: total / used (remaining is a virtual) |
| leaverequests | Each leave application with full lifecycle status |
| auditlogs | Immutable record of every state change — who/what/when |

#### Authentication Design
- JWT (JSON Web Token) stateless authentication
- Token signed with JWT_SECRET, expires per JWT_EXPIRES_IN
- Token stored in localStorage on client; sent via Authorization: Bearer header
- protect middleware validates token on every private route
- authorize(...roles) middleware enforces RBAC (Role-Based Access Control)

---

### Phase 3 — Implementation (Coding)

Built feature-by-feature, vertical-by-vertical:

1. Foundation (Nithilan): server.js, app.js, config/db.js, middleware (auth + error), all 5 Mongoose models, seed script, Docker, GitHub Actions CI
2. Auth vertical (Nithilan): authController.js, authRoutes.js, generateToken.js, authSlice.js (Redux), Login.jsx, ProtectedRoute.jsx
3. Employee vertical (Nithilan): leaveService.js, leaveController.js, leaveRoutes.js, Dashboard.jsx, ApplyLeave.jsx, MyRequests.jsx
4. Manager vertical (Muskan): managerController.js, managerRoutes.js, ApprovalQueue.jsx — reuses approval logic from leaveService.js
5. HR vertical (Mohnish): userService.js, balanceService.js, leaveTypeService.js, reportService.js, all HR controllers, routes, ManageUsers.jsx, LeaveTypes.jsx, HRDashboard.jsx, Reports.jsx

Tech discipline enforced throughout:
- Controllers stay thin — no business logic in controllers
- Services are the single place for business rules (testable without HTTP)
- Models validate at the schema level (Mongoose validators, pre-hooks)
- Errors always flow through asyncHandler -> errorHandler

---

### Phase 4 — Testing

Unit tests (Jest + mongodb-memory-server): run in isolation, no real DB needed
- authController.unit.test.js — register, login, duplicate email, inactive account
- leaveService.employee.unit.test.js — apply, balance check, cancel, ownership
- leaveService.manager.unit.test.js — approve, reject, team ownership check
- leaveTypeService.unit.test.js — create, update quota propagation, delete guard
- userService.unit.test.js — create user + auto-balance, update, deactivate
- reportService.unit.test.js — summary, monthly, by-type, by-department, CSV, audit logs
- managerController.unit.test.js — controller layer tests
- manager.flow.test.js — end-to-end integration flow test
Total: 80 tests across 8 test files
CI/CD: GitHub Actions runs npm test (server) + npm run build (client) on every push/PR to main

---

### Phase 5 — Deployment

- Backend (API): Render Web Service — root server/, runs node server.js
- Database: MongoDB Atlas (cloud-managed)
- Frontend: Vercel — root client/, Vite preset
- Containerization: Docker + docker-compose for local full-stack runs

---

## 3. Functional Requirements

### FR-1: Authentication

| ID | Requirement |
|---|---|
| FR-1.1 | Users must be able to log in with email and password |
| FR-1.2 | System issues a JWT on successful login |
| FR-1.3 | Token must be sent with every protected request |
| FR-1.4 | Deactivated accounts must be blocked from logging in |
| FR-1.5 | Self-registration always creates an employee — role change is HR-only |

### FR-2: Employee Role

| ID | Requirement |
|---|---|
| FR-2.1 | Employee can apply for leave (select type, start/end date, reason) |
| FR-2.2 | System must check remaining balance before accepting the request |
| FR-2.3 | System must account for already-pending requests when checking balance |
| FR-2.4 | Employee can view their leave balance (per type: total, used, remaining) |
| FR-2.5 | Employee can view all their past and current leave requests |
| FR-2.6 | Employee can cancel a PENDING request |
| FR-2.7 | Employee cannot cancel an APPROVED or REJECTED request |
| FR-2.8 | Employee can only cancel their own requests |

### FR-3: Manager Role

| ID | Requirement |
|---|---|
| FR-3.1 | Manager can see all PENDING requests from their direct reports |
| FR-3.2 | Manager can view full team leave history (all statuses) |
| FR-3.3 | Manager can approve a PENDING request (balance deducted immediately) |
| FR-3.4 | Manager can reject a PENDING request (comment required) |
| FR-3.5 | Manager can only act on requests from their own team |
| FR-3.6 | Manager cannot act on already-decided requests |

### FR-4: HR Role — User Management

| ID | Requirement |
|---|---|
| FR-4.1 | HR can create user accounts (any role) |
| FR-4.2 | HR can edit user name, email, department, role, assigned manager |
| FR-4.3 | HR can deactivate/reactivate a user (soft delete — not hard delete) |
| FR-4.4 | HR can reset a user password |
| FR-4.5 | HR cannot deactivate their own account |
| FR-4.6 | HR cannot remove their own HR role |
| FR-4.7 | HR can view and manually adjust any user leave balance |
| FR-4.8 | HR can initialize missing balances for a user |

### FR-5: HR Role — Leave Policy

| ID | Requirement |
|---|---|
| FR-5.1 | HR can create new leave types (name, annual quota, description) |
| FR-5.2 | Creating a type auto-allocates it to all active users |
| FR-5.3 | HR can edit leave type name, quota, description |
| FR-5.4 | Quota changes can optionally propagate to all existing balances |
| FR-5.5 | HR can delete a leave type (only if no requests have used it) |
| FR-5.6 | HR can perform a year-end balance reset |

### FR-6: Reporting and Audit

| ID | Requirement |
|---|---|
| FR-6.1 | HR can view organisation-wide headline statistics |
| FR-6.2 | HR can view approved leave days per month (with year filter) |
| FR-6.3 | HR can view leave breakdown by type and by department |
| FR-6.4 | HR can view, filter, and export all leave requests as CSV |
| FR-6.5 | Every leave state change must be logged to an immutable audit trail |
| FR-6.6 | Audit log must be readable by HR, paginated, filterable by action |

---

## 4. Non-Functional Requirements

### NFR-1: Security

| ID | Requirement |
|---|---|
| NFR-1.1 | Passwords stored using bcrypt (salt rounds = 10) — never plain text |
| NFR-1.2 | JWT secret never committed to source control (.env is gitignore-d) |
| NFR-1.3 | RBAC enforced server-side — frontend restriction is UX only |
| NFR-1.4 | Password field excluded from all query results by default (select: false) |
| NFR-1.5 | Stack traces hidden in production responses |
| NFR-1.6 | CORS restricted to known frontend origin |
| NFR-1.7 | Malformed MongoDB ObjectIDs rejected cleanly (400) not as 500 |

### NFR-2: Performance

| ID | Requirement |
|---|---|
| NFR-2.1 | Reporting aggregations computed inside MongoDB (not in Node memory) |
| NFR-2.2 | Audit log paginated (default 25/page, max 100) |
| NFR-2.3 | Compound unique index on {user, leaveType} in LeaveBalance |
| NFR-2.4 | Balance allocation uses bulkWrite (one DB round-trip for all users) |

### NFR-3: Reliability and Maintainability

| ID | Requirement |
|---|---|
| NFR-3.1 | Server only starts listening AFTER DB connection is established |
| NFR-3.2 | unhandledRejection caught globally — server shuts down gracefully |
| NFR-3.3 | All async controllers wrapped in asyncHandler — no unhandled rejections |
| NFR-3.4 | Business logic isolated in services — controllers are thin and testable |
| NFR-3.5 | Audit logs are append-only — never updated or deleted |

### NFR-4: Usability

| ID | Requirement |
|---|---|
| NFR-4.1 | Role-specific navigation shown based on logged-in user role |
| NFR-4.2 | Status shown with color-coded chips (PENDING=yellow, APPROVED=green, REJECTED=red) |
| NFR-4.3 | Loading spinners shown during API calls |
| NFR-4.4 | Both frontend and backend validation for all inputs |
| NFR-4.5 | Error messages surface cleanly (API message displayed in the UI) |

### NFR-5: Scalability and DevOps

| ID | Requirement |
|---|---|
| NFR-5.1 | Dockerized for consistent local + production environment |
| NFR-5.2 | CI/CD via GitHub Actions on every push to main |
| NFR-5.3 | Swagger UI documenting all 30+ API endpoints |
| NFR-5.4 | app.js and server.js separated — tests can import app without opening a port |
| NFR-5.5 | Tests use in-memory MongoDB — no external DB dependency |

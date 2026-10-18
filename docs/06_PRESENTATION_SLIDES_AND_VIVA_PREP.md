# Leave Management System (LMS)
## Presentation Slides Deck & Viva Voce Preparation Guide

---

## Part 1: Complete 14-Slide Presentation Deck

Use this exact structure to build your PowerPoint / Google Slides deck for the demonstration.

---

### Slide 1: Title Slide
- **Title**: Enterprise Leave Management System (LMS)
- **Subtitle**: A Production-Grade Full-Stack MERN Application with Multi-Tiered RBAC & Automated Workflow
- **Academic Context**: Full Stack Web Development (SEM 5)
- **Team Members**:
  - **Nithilan**: Lead Architect, Authentication & Employee Vertical
  - **Muskan**: Manager Vertical & Approval Workflow Engine
  - **Mohnish**: HR/Admin Vertical, Aggregations & DevOps
- **Tech Stack Badge**: MongoDB Atlas | Express.js | React 18 (Vite) | Node.js | Docker | Jest
- **Speaker Script**:
  > "Respected faculty and evaluators, good morning. Today our team presents the Leave Management System. In modern corporate environments, leave tracking on spreadsheets or emails leads to lost records, policy violations, and zero accountability. Our project solves this through a robust, full-stack application featuring role-based workflows, automated quota enforcement, and an immutable audit trail."

---

### Slide 2: Problem Statement & Enterprise Motivation
- **Visual**: Contrast graphic — *Traditional Email/Paper Tracking vs. Modern Automated LMS*
- **Key Bullet Points**:
  - **Legacy Pitfalls**: Manual spreadsheet tracking, email clutter, untracked approvals, and human error in quota deduction.
  - **Concurrency & Over-Allocation**: Employees applying for overlapping leaves without real-time balance validation.
  - **Regulatory Compliance**: Lack of a tamper-proof audit trail of who approved what, when, and why.
  - **Role Friction**: Managers lacking visibility into team availability, leading to departmental understaffing.
- **Speaker Script**:
  > "The primary problem in legacy leave management is the disconnect between policy enforcement and employee actions. Without real-time balance holds and centralized access controls, organizations face over-allocation and compliance vulnerabilities. Our system automates this entire lifecycle with mathematical precision."

---

### Slide 3: Software Development Life Cycle (SDLC) Followed
- **Visual**: Agile Sprint Flow Diagram (Sprint 1: Foundation -> Sprint 2: Core Roles -> Sprint 3: Hardening -> Sprint 4: Polish)
- **Key Bullet Points**:
  - **Model**: **Agile-Inspired Iterative Lifecycle** over 12 weeks.
  - **Phase 1: Planning & Blueprinting**: Stakeholder analysis and creation of `Leave_Management_System_Blueprint.docx` as single source of truth.
  - **Phase 2: Architectural & Schema Design**: Designing 3-tier layered architecture and normalizing 5 MongoDB collections.
  - **Phase 3: Vertical-Slice Implementation**: Concurrent development across Employee, Manager, and HR domains.
  - **Phase 4: Automated Testing**: 80 unit and integration tests using Jest and Supertest.
  - **Phase 5: Containerization & CI/CD**: Docker multi-stage builds and GitHub Actions pipelines.
- **Speaker Script**:
  > "We adopted an Agile iterative model. Rather than writing code ad-hoc, we established an architectural blueprint defining our database contract and REST APIs upfront. We developed in vertical feature slices—ensuring that each role was fully tested before integrating into the main branch via peer-reviewed pull requests."

---

### Slide 4: Functional Requirements (By User Persona)
- **Visual**: 3-Column Persona Card Table (Employee | Manager | HR Admin)
- **Key Bullet Points**:
  - **Authentication**: Secure JWT-based registration, login, and active-status verification.
  - **Employee Persona**: Real-time balance inspection, date-range leave application, balance-hold validation, and pending cancellation.
  - **Manager Persona**: Direct-report queue filtering, approve/reject with mandatory feedback, and team availability history.
  - **HR / Admin Persona**: Organization-wide user provisioning, role promotion, leave policy definitions, quota auto-propagation, and CSV reporting.
- **Speaker Script**:
  > "Our functional requirements strictly segregate permissions. Employees can only view and cancel their own requests; managers can only review direct subordinates; and HR administrators maintain policy control, user provisioning, and executive reporting."

---

### Slide 5: Non-Functional Requirements (NFRs)
- **Visual**: Pillars of Excellence (Security | Performance | Reliability | Scalability)
- **Key Bullet Points**:
  - **Security**: Salted Bcrypt password hashing (10 rounds), HTTP-only token transport, strict CORS origins, and server-side RBAC.
  - **Performance**: In-database MongoDB aggregation pipelines ($O(1)$ Node memory overhead) and compound indexes.
  - **Reliability & Auditability**: Append-only immutable `AuditLog` collection capturing every status transition.
  - **Maintainability**: Strict Separation of Concerns (Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Models).
- **Speaker Script**:
  > "An enterprise system is judged by its non-functional qualities. We prioritized security by hashing credentials with bcrypt and enforcing role checks strictly on the backend. We ensured high performance by pushing analytical computations into MongoDB's native aggregation engine."

---

### Slide 6: System Architecture (3-Tier Layered Design)
- **Visual**: Layered Architecture Diagram (React Client $\rightarrow$ Express Gateway $\rightarrow$ Service Layer $\rightarrow$ Mongoose ODM $\rightarrow$ MongoDB Atlas)
- **Key Bullet Points**:
  - **Client Tier**: React 18 Single Page Application with Redux Toolkit and Axios interceptors.
  - **API Gateway Tier**: Express.js router with `protect` and `authorize` middleware gates.
  - **Controller Tier**: Thin HTTP adapters handling request parsing and response statuses.
  - **Service Tier**: Pure, isolated domain logic (balances, calculations, validations).
  - **Data Tier**: Mongoose ODM with schema validations connected to MongoDB Atlas.
- **Speaker Script**:
  > "Our architectural design follows a clean 3-tier layered pattern. Notice how our controllers contain zero business logic—they only parse HTTP requests and delegate to our Service Layer. This makes our core domain logic completely decoupled and testable in isolation."

---

### Slide 7: Database Design & Schemas
- **Visual**: Entity-Relationship Diagram of the 5 Collections
- **Key Bullet Points**:
  - **`users`**: Master directory with self-referencing `manager` pointer and `isActive` soft-delete flag.
  - **`leavetypes`**: Policy catalog defining annual quotas with case-insensitive unique indexes.
  - **`leavebalances`**: Normalized balance per user-type pair; compound unique index `{ user: 1, leaveType: 1 }`.
  - **`leaverequests`**: Lifecycle entity with state machine: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
  - **`auditlogs`**: Append-only ledger recording actor, timestamp, action, and notes.
- **Speaker Script**:
  > "We engineered a normalized 5-collection schema in MongoDB Atlas. Rather than embedding growing request arrays inside the user document—which would hit MongoDB's 16MB document limit—we normalized relationships. We also used Mongoose virtuals for `remaining` balance so it is computed dynamically on the fly."

---

### Slide 8: Technology Stack Justification
- **Visual**: Stack Logos & Justification Grid
- **Key Bullet Points**:
  - **React 18 + Vite**: Lightning-fast Hot Module Replacement and modular UI component reusability.
  - **Node.js + Express**: Non-blocking asynchronous I/O ideal for concurrent enterprise REST calls.
  - **MongoDB + Mongoose**: JSON-native document model with enterprise schema validation hooks.
  - **JWT & Redux Toolkit**: Stateless scalable authorization coupled with predictable client state.
  - **Docker & Docker Compose**: Complete environment parity eliminating 'it works on my machine' issues.
- **Speaker Script**:
  > "Every tool in our stack was chosen deliberately. Node's event-driven architecture handles high-volume API requests with low resource overhead, while MongoDB allows our JSON documents to flow naturally from database to client without cumbersome object-relational mapping impedance."

---

### Slide 9: Persona 1 — Employee Vertical & Spine (Nithilan)
- **Visual**: Screenshot of Employee Dashboard & Apply Leave Interface
- **Key Contributions**:
  - Project spine: Server lifecycle (`server.js`, `app.js`), database connection, Mongoose schemas.
  - JWT Authentication, bcrypt hashing, and `protect` / `authorize` middleware.
  - Employee application workflow: real-time duration computation and pending quota hold logic.
  - Frontend: `Dashboard.jsx`, `ApplyLeave.jsx`, `MyRequests.jsx`, and Redux auth slice.
- **Speaker Script**:
  > "I took ownership of the project spine and the employee vertical. I implemented our JWT authentication and designed the core database models. In the employee flow, I solved the double-booking loophole by building `getAvailableDays`, which prevents employees from submitting requests exceeding their balance by factoring in both approved and currently pending days."

---

### Slide 10: Persona 2 — Manager Vertical & Workflow Engine (Muskan)
- **Visual**: Screenshot of Manager Approval Queue with Comment Modal
- **Key Contributions**:
  - Manager approval queue backend (`managerController.js`, `managerRoutes.js`).
  - Approval workflow engine with atomic balance deduction (`balance.used += days`).
  - Strict reporting boundary: queries direct reports via `{ manager: managerId }`.
  - Frontend: `ApprovalQueue.jsx` with real-time actionable status chips and feedback dialogs.
  - Unit and integration test suites: `manager.flow.test.js` validating end-to-end decisions.
- **Speaker Script**:
  > "I built the Manager vertical and workflow engine. Managers only have visibility over employees who report directly to them. When a manager approves a request, our service executes an atomic database update to deduct the leave balance and automatically writes an immutable record to the audit ledger."

---

### Slide 11: Persona 3 — HR Vertical, Analytics & DevOps (Mohnish)
- **Visual**: Screenshot of HR Reports Analytics & Swagger UI
- **Key Contributions**:
  - User Directory (`ManageUsers.jsx`) with self-deactivation guards and role management.
  - Leave Policy catalog (`LeaveTypes.jsx`) with batch quota propagation via MongoDB `bulkWrite`.
  - Enterprise Analytics (`Reports.jsx`) using native MongoDB aggregation pipelines and CSV export.
  - DevOps: Docker multi-stage containers, docker-compose orchestration, and OpenAPI 3.0 Swagger docs.
- **Speaker Script**:
  > "I owned the HR/Admin vertical and DevOps pipeline. For analytics, I utilized MongoDB's aggregation pipelines to compute monthly utilization and department breakdowns directly inside the database engine. I also containerized the entire application using Docker and generated OpenAPI 3.0 documentation for all 30 endpoints."

---

### Slide 12: Defensive Engineering & Edge Cases Handled
- **Visual**: Shield Matrix showing 16 Defensive Guards
- **Key Bullet Points**:
  - **Concurrency & Over-Allocation**: Pending requests hold balance; double-approval race conditions blocked.
  - **Temporal Integrity**: Dates validated on save; `endDate < startDate` and past dates rejected.
  - **Administrative Protection**: HR prevented from self-deactivating or self-demoting.
  - **Referential Integrity**: Deletion of leave types in active use blocked.
  - **Input Sanitization**: `assertValidId` prevents malformed MongoDB ObjectIDs from crashing server.
- **Speaker Script**:
  > "To ensure enterprise reliability, we implemented 16 specific defensive guards. For instance, malformed MongoDB IDs are sanitized before hitting the database to return clean 400 Bad Request responses instead of 500 server crashes. Furthermore, HR cannot accidentally deactivate their own account, preventing administrative lockout."

---

### Slide 13: Testing, Quality Assurance & CI/CD
- **Visual**: Terminal showing 80 passing Jest tests + GitHub Actions Green Checkmark
- **Key Bullet Points**:
  - **Test Suite**: 80 automated tests across 8 test suites (Controllers, Services, Integration flows).
  - **In-Memory Testing**: `mongodb-memory-server` allows fast, isolated execution without touching production data.
  - **CI/CD Pipeline**: GitHub Actions automatically runs linter, test suites, and client builds on every push.
  - **Interactive Documentation**: Swagger UI accessible at `/api-docs` with Bearer auth testing.
- **Speaker Script**:
  > "Our quality assurance is fully automated. We wrote 80 automated unit and integration tests covering every service method. Our CI/CD pipeline runs these tests automatically on GitHub Actions, guaranteeing that broken code cannot be merged into the main branch."

---

### Slide 14: Conclusion & Future Roadmap
- **Visual**: System Summary & Roadmap Timeline
- **Key Bullet Points**:
  - **Key Achievements**: Fully working, hardened, multi-tier Leave Management System delivered on schedule.
  - **Compliance Ready**: Complete audit trail and role isolation.
  - **Future Roadmap**:
    - Automated email and Slack webhook notifications.
    - Automated escalation cron jobs for overdue pending requests.
    - Google Calendar / Outlook iCal feed synchronization.
- **Speaker Script**:
  > "In conclusion, our team has built a resilient, production-ready Leave Management System that fulfills all functional, non-functional, and SDLC requirements. We thank our faculty for their guidance, and we are now ready for the live demonstration and Q&A."

---

## Part 2: Comprehensive Viva Voce Q&A Bank (25 High-Frequency Questions)

### Category A: Database & Mongoose ODM
1. **Q: Why did you choose MongoDB over a traditional SQL database like PostgreSQL?**
   - **Answer**: "MongoDB's document model represents hierarchical business entities (such as user profiles and leave applications) naturally without complex multi-table joins. Its native aggregation framework allows us to perform high-performance analytical queries directly on JSON-like structures."
2. **Q: What is a Mongoose Virtual, and where did you use it?**
   - **Answer**: "A virtual property is a calculated field that exists only in memory and is not stored in the database. In `LeaveBalance.js`, we defined `remaining` as a virtual that returns `total - used`. This ensures that remaining days can never become inconsistent with the stored total and used values."
3. **Q: Why did you create a compound unique index on `LeaveBalance`?**
   - **Answer**: "We applied `leaveBalanceSchema.index({ user: 1, leaveType: 1 }, { unique: true })` to guarantee at the database level that an employee can only possess exactly one balance record per leave type, eliminating duplicate balance bugs."
4. **Q: What is the purpose of `bulkWrite` in your `balanceService.js`?**
   - **Answer**: "When HR creates a new leave type, every employee needs an initial balance. Instead of sending 1,000 individual insert operations over the network, `bulkWrite` sends a single batch command, executing all operations in one network round-trip."

### Category B: Security & Architecture
5. **Q: What is inside your JWT, and how is it verified?**
   - **Answer**: "Our JWT payload contains only non-sensitive identifiers: the user's MongoDB `_id` and their `role`. When a request arrives, our `protect` middleware verifies the cryptographic signature against `JWT_SECRET` and confirms the user account is active."
6. **Q: Why do you set `select: false` on the password field in `User.js`?**
   - **Answer**: "Setting `select: false` ensures that queries like `User.find()` or `User.findById()` do not return the hashed password by default. This prevents accidental credential leaks in API responses or logs."
7. **Q: How does your application prevent SQL/NoSQL Injection?**
   - **Answer**: "Mongoose schemas enforce strict type casting and validation on all query parameters. Furthermore, we explicitly extract and sanitize query fields rather than passing raw `req.body` directly into database query operators."
8. **Q: Why do you have both controllers and services?**
   - **Answer**: "This follows the 3-tier architectural pattern. Controllers handle HTTP-specific logic (reading headers, parsing JSON, setting HTTP status codes), while Services encapsulate business logic. This allows our service functions to be tested in isolation without mocking Express request and response objects."

### Category C: Business Logic & Workflow
9. **Q: Walk me through what happens when an employee clicks 'Apply for Leave'.**
   - **Answer**: "1. The React frontend computes the calendar day count and sends a `POST /api/leave/apply` request with the JWT Bearer token.
   2. The `protect` middleware verifies the token and loads the active user.
   3. `leaveController` invokes `leaveService.applyForLeave()`.
   4. The service fetches the employee's balance and calculates available quota minus pending commitments via `getAvailableDays()`.
   5. If valid, it creates a `LeaveRequest` with status `PENDING` and inserts a `CREATED` record into `AuditLog`.
   6. It returns 201 Created to the client, which updates the UI."
10. **Q: What happens if an employee tries to cancel an already approved request?**
    - **Answer**: "The backend checks `if (request.status !== 'PENDING') throw createError(..., 400)`. Only pending requests can be cancelled by employees. Once approved, only a manager or HR can modify or revoke the leave."
11. **Q: How do you handle team boundaries so managers can't see other departments?**
    - **Answer**: "In `leaveService.getTeamRequests`, we query `User.find({ manager: managerId }).distinct('_id')` to find direct reports and filter requests using `{ employee: { $in: teamIds } }`. In approval actions, we verify that `request.employee.manager` matches the reviewer's ID."

### Category D: Testing & DevOps
12. **Q: How do your unit tests run without an internet connection or external MongoDB?**
    - **Answer**: "We use `mongodb-memory-server`, which downloads and spins up a temporary in-memory MongoDB binary locally in RAM during test execution. Tests run in complete isolation and discard data when the suite finishes."
13. **Q: How does Docker benefit this project?**
    - **Answer**: "Docker packages the Node.js backend, React frontend, and Nginx reverse proxy into immutable containers. This ensures that the application runs identically across development, staging, and production environments."

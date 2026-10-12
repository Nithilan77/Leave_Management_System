# Leave Management System

A production-quality MERN-stack application that digitizes how an
organization handles employee leave: employees apply online, managers
review and approve/reject, and HR/Admin manages policies, users, and
organization-wide reports — replacing the email-and-paper process.

**Stack:** MongoDB · Express · React (Vite) · Node.js
**Team:** Nithilan · Muskan · Mohnish

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Run with Docker (recommended)](#run-with-docker-recommended)
  - [Run locally without Docker](#run-locally-without-docker)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Security Notes](#security-notes)

---

## Features

### User roles
Three roles, enforced server-side via JWT + RBAC middleware (never trusted
from the frontend):

| Role | Can do |
|---|---|
| **Employee** | Apply for leave, view own balances/history, cancel pending requests |
| **Manager** | Review their team's pending requests, approve/reject with a comment |
| **HR / Admin** | Manage users & roles, define leave types/quotas, view org-wide reports & audit trail |

### Core (must-have)
- JWT-based authentication & authorization, three roles with RBAC
- Employee: apply for leave (type, date range, reason) with live balance check
- Employee: dashboard — balances by type, past & pending requests
- Manager: approval queue — approve/reject with a comment
- HR: user management — add/edit/deactivate users, assign roles & managers
- HR: leave policy management — leave types & annual quotas
- Automatic leave balance deduction on approval, per leave type
- Audit trail — every state change logged with who/what/when
- Role-specific dashboards, including charts (monthly trend, by leave type, by department)

### Nice-to-have (as implemented)
- Reports & analytics: summary stats, by-leave-type, by-department, monthly trend (charts), CSV export, paginated audit log
- API documentation via Swagger UI

> Email notifications, escalation jobs, and a team leave calendar are in the
> original blueprint's nice-to-have list but not yet built — see
> [Next Steps](#next-steps-ideas-for-further-work) below if you want to add them.

---

## Architecture

Standard three-tier MERN architecture with a cleanly layered backend:

```
Client (React)  <-- REST/JSON -->  Express API  <-- Mongoose -->  MongoDB
```

**Backend layering** (`server/`):
```
routes/      -> controllers/   -> services/        -> models/
(HTTP verbs)    (req/res glue)    (business logic)    (Mongoose schemas)
```
- **Routes** declare the URL + HTTP method + middleware (auth/RBAC) and point to a controller.
- **Controllers** parse the request, call a service, shape the response. No business logic here.
- **Services** hold the actual business rules (balance checks, approval workflow, report aggregation).
- **Models** define the MongoDB collections (Mongoose schemas).

This separation keeps the code testable — services are unit-tested without
needing an HTTP layer.

### Approval workflow

```
Employee submits request
        │  (balance checked; state = PENDING)
        ▼
Manager reviews against team requests
        │
        ├── Approve ──► state = APPROVED ──► balance deducted ──► audit logged
        └── Reject  ──► state = REJECTED (comment required) ──► audit logged
```

Every transition is written to the `auditLogs` collection with who performed
it, when, and what changed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, MUI, Redux Toolkit, React Router, Axios, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB (Atlas) |
| Auth | JWT, bcrypt |
| Testing | Jest, Supertest, mongodb-memory-server |
| Docs | Swagger UI (`swagger-ui-express`) |
| Containerization | Docker, docker-compose |
| CI | GitHub Actions |

---

## Getting Started

### Run with Docker (recommended)

```bash
cp env.compose.example .env   # fill in MONGO_URI, JWT_SECRET, etc.
docker compose up --build
```

- Client: http://localhost:5173
- Server: http://localhost:5000/api/health
- API docs: http://localhost:5000/api/docs

### Run locally without Docker

```bash
# 1. Server
cd server
cp .env.example .env          # fill in MONGO_URI, JWT_SECRET
npm install
npm run dev                   # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173
```

---

## Environment Variables

### `server/.env` (direct `npm run dev`) / root `.env` (docker-compose)

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `MONGO_URI` | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Long random string used to sign JWTs — **never commit a real value** |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `CLIENT_URL` | Frontend origin allowed by CORS |

### Client (`VITE_API_URL`, set at build/deploy time)
The base URL the frontend calls, e.g. `http://localhost:5000/api` locally or
your deployed API's `/api` URL in production.

A committed `.env.example` / `env.compose.example` documents these with
placeholder values — copy it to `.env` and fill in real secrets locally;
`.env` itself is git-ignored.

---

## API Documentation

Interactive Swagger UI is served at **`/api/docs`** once the server is
running (e.g. `http://localhost:5000/api/docs`). It documents every endpoint
below with request/response shapes and lets you try requests with a Bearer
token.

---

## API Overview

All routes are mounted under `/api`. Every route except `/auth/register` and
`/auth/login` requires a JWT (`Authorization: Bearer <token>`); role-restricted
routes additionally require the matching role.

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an account |
| POST | `/auth/login` | Public | Log in, receive a JWT |
| GET | `/auth/me` | Any | Current user's profile |
| POST | `/leaves` | Any | Apply for leave |
| GET | `/leaves/me` | Any | My leave requests |
| GET | `/leaves/me/balances` | Any | My leave balances |
| PATCH | `/leaves/:id/cancel` | Any (owner) | Cancel my pending request |
| GET | `/manager/team` | Manager/HR | My team's requests |
| PATCH | `/manager/leaves/:id/approve` | Manager/HR | Approve a request |
| PATCH | `/manager/leaves/:id/reject` | Manager/HR | Reject a request (comment required) |
| GET/POST | `/users` | HR | List / create users |
| GET | `/users/managers` | HR | Managers & HR (for dropdowns) |
| GET/PUT | `/users/:id` | HR | Get / edit a user |
| PATCH | `/users/:id/status` | HR | Activate / deactivate |
| PATCH | `/users/:id/password` | HR | Reset password |
| GET | `/users/:id/balances` | HR | A user's balances |
| POST | `/users/:id/balances/initialize` | HR | Create missing balances |
| PUT | `/users/:id/balances/:leaveTypeId` | HR | Set total days for a type |
| GET/POST | `/leave-types` | Any (GET) / HR (POST) | List / create leave types |
| GET/PUT/DELETE | `/leave-types/:id` | Any (GET) / HR | Get / update / delete a type |
| POST | `/leave-types/:id/allocate` | HR | Allocate a type to all users |
| POST | `/leave-types/reset-balances` | HR | Year-end balance reset |
| GET | `/reports/summary` | HR | Headline numbers |
| GET | `/reports/by-leave-type` | HR | Breakdown per leave type |
| GET | `/reports/by-department` | HR | Breakdown per department |
| GET | `/reports/monthly?year=` | HR | Approved days per month |
| GET | `/reports/requests` | HR | All requests (filterable) |
| GET | `/reports/requests/export` | HR | Same, as CSV |
| GET | `/reports/audit-logs` | HR | Audit trail (paginated) |

---

## Data Model

Four core collections (MongoDB, referenced by `ObjectId`):

- **users** — name, email, password (hashed), role (`employee`/`manager`/`hr`), department, manager reference
- **leaveTypes** — name (casual/sick/earned, etc.), annual quota
- **leaveBalances** — per user, per leave type: total / used / remaining
- **leaveRequests** — employee, leave type, date range, days, reason, status (`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`/`ESCALATED`), reviewedBy, comment
- **auditLogs** — action, performedBy, affected request, timestamp, details

---

## Testing

```bash
cd server
npm test
```

80 Jest unit/flow tests cover auth, leave application, manager approval
flow, leave-type management, user management, and reporting — run with
`mongodb-memory-server` so no real database is needed.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
- **server-tests** — `npm ci && npm test` in `server/`
- **client-build** — `npm ci && npm run build` in `client/`

---

## Project Structure

```
LMS/
├── docker-compose.yml
├── env.compose.example
├── server/
│   ├── app.js            # Express app (middleware, routes, Swagger, error handling)
│   ├── server.js         # Boot: connect DB, then listen
│   ├── config/           # db connection, swagger spec
│   ├── routes/           # URL -> controller mapping per vertical
│   ├── controllers/      # req/res glue
│   ├── services/         # business logic
│   ├── models/           # Mongoose schemas
│   ├── middleware/        # auth, RBAC, error handling
│   └── tests/            # Jest unit & flow tests
└── client/
    ├── src/
    │   ├── pages/         # employee / manager / hr pages
    │   ├── components/    # Layout, nav, shared UI
    │   ├── store/         # Redux slices (auth, etc.)
    │   └── api/           # Axios instance
    └── dist/              # production build output
```

---

## Deployment

- **API + DB:** Render (Web Service, root `server/`) + MongoDB Atlas
- **Client:** Vercel (root `client/`, Vite preset)

Set `VITE_API_URL` on Vercel to the deployed API's `/api` URL, and `CLIENT_URL`
on Render to the deployed Vercel URL (for CORS).

---

# Leave Management System — Backend (Server)

The Express + MongoDB REST API for the Leave Management System.

## Tech Stack

- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — database & modeling
- **JWT + bcryptjs** — authentication (added next)
- **Jest + Supertest** — testing

## Project Structure

```
server/
├── config/         # DB connection & configuration
│   └── db.js
├── models/         # Mongoose schemas (added next)
├── routes/         # Express route definitions
├── controllers/    # Request handlers (thin — call services)
├── services/       # Business logic
├── middleware/     # Auth, RBAC, validation, error handling
│   └── errorHandler.js
├── utils/          # Helpers
│   └── asyncHandler.js
├── tests/          # Jest + Supertest tests
├── app.js          # Express app configuration (no server start)
├── server.js       # Boots DB + starts the server
└── .env            # Your local secrets (never commit this)
```

> **Why `app.js` and `server.js` are separate:** `app.js` only *builds* the
> Express app, so tests can import it and hit routes without opening a port.
> `server.js` handles startup (DB connect + listen). This is a deliberate,
> professional separation.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A MongoDB database — either:
  - **Local:** MongoDB Community Server running on your machine, or
  - **Cloud:** a free MongoDB Atlas cluster (recommended for the team, so you
    all share one database).

### 2. Install dependencies
```bash
cd server
npm install
```

### 3. Configure environment
Copy the example env file and fill in your values:
```bash
cp .env.example .env
```
Then edit `.env` and set at least `MONGO_URI` and `JWT_SECRET`.

### 4. Run the server
```bash
npm run dev     # development, auto-restarts on changes (nodemon)
# or
npm start       # plain node
```

### 5. Verify it works
Open in your browser or use curl:
```bash
curl http://localhost:5000/api/health
```
You should see a JSON response confirming the API is running.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start`   | Start with plain node |
| `npm test`    | Run the Jest test suite |

## Next Steps (per the blueprint)

1. ✅ **Scaffold + backend foundation** (this) — server boots, DB config, error handling
2. ⬜ **Data models** — User, LeaveType, LeaveBalance, LeaveRequest, AuditLog
3. ⬜ **Auth + RBAC** — register/login, JWT, role-based access middleware
4. ⬜ Feature verticals (Employee → Manager → HR)

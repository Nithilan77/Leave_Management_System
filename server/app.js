const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * app.js builds and configures the Express application, but does NOT start
 * the server or connect to the database. Keeping app creation separate from
 * server startup (in server.js) is a deliberate, professional pattern:
 *
 *   - Tests can import this `app` and hit routes with Supertest WITHOUT
 *     opening a real network port or needing the full startup sequence.
 *   - server.js stays responsible only for "boot the app" concerns.
 *
 * Routes will be mounted here as we build each feature (auth, leaves, users...).
 */
const app = express();

// ---- Global middleware ----

// Allow the React frontend (different origin/port) to call this API.
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// ---- Health check route ----
// A simple endpoint to confirm the API is alive. Useful for uptime checks
// and for verifying deployment. Also handy as the very first thing to test.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Leave Management System API is running',
    timestamp: new Date().toISOString(),
  });
});

// ---- Feature routes (mounted as we build them) ----
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/leaves', require('./routes/leaveRoutes'));

// ---- Error handling (MUST be last) ----
app.use(notFound);       // 404 for unmatched routes
app.use(errorHandler);   // central error formatter

module.exports = app;

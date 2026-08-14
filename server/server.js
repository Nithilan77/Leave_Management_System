// Load environment variables from .env FIRST, before anything else needs them.
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

/**
 * Startup sequence:
 *   1. Connect to MongoDB (if this fails, we exit — see config/db.js).
 *   2. Only once the DB is ready, start listening for HTTP requests.
 *
 * Doing it in this order means the server never accepts requests before
 * the database is available.
 */
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });

  // Safety net: if a promise rejection slips through unhandled, log it and
  // shut down gracefully rather than leaving the app in a broken state.
  process.on('unhandledRejection', (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();

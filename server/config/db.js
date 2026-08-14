const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string in MONGO_URI.
 *
 * We keep this in its own module (separation of concerns) so that:
 *  - server.js stays clean and only orchestrates startup
 *  - tests can import and control the connection independently
 *
 * If the connection fails at startup, there is no point continuing,
 * so we log the error and exit the process with a failure code.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1); // 1 = exit with failure
  }
};

module.exports = connectDB;

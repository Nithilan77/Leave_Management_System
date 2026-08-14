/**
 * Centralized error handling.
 *
 * Two pieces work together:
 *  1. notFound      -> catches any request to a route that doesn't exist (404)
 *  2. errorHandler  -> the final middleware that formats ALL errors into a
 *                      consistent JSON shape with the correct status code.
 *
 * Because this is defined LAST in server.js (after all routes), any error
 * passed via next(err) — or thrown in an async handler wrapped by asyncHandler —
 * ends up here. This keeps error formatting in ONE place instead of repeating
 * try/catch response logic in every controller.
 */

// Handles requests that match no route
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// The final error-handling middleware (must have 4 params)
const errorHandler = (err, req, res, next) => {
  // If a controller already set a status, keep it; otherwise 500.
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    // Only leak the stack trace while developing, never in production.
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };

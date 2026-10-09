const asyncHandler = require('./asyncHandler');

/**
 * serviceHandler
 * ---------------
 * asyncHandler + the "applyStatus" step from leaveController, in one wrapper.
 *
 * Services throw errors that carry a statusCode (see utils/createError.js).
 * This wrapper copies that code onto the response before passing the error to
 * the central errorHandler, so a "User not found" becomes a 404 instead of a 500.
 *
 * It saves writing the same try/catch in every controller function:
 *
 *   const getUser = serviceHandler(async (req, res) => {
 *     const user = await userService.getUserById(req.params.id);
 *     res.json({ success: true, user });
 *   });
 */
const serviceHandler = (fn) => asyncHandler(async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    throw err;
  }
});

module.exports = serviceHandler;

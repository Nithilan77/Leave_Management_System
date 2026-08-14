/**
 * asyncHandler
 *
 * A tiny wrapper that removes the need for a try/catch block in every
 * async controller. It wraps an async function and forwards any rejected
 * promise (i.e. a thrown error) to Express's next(), so our central
 * errorHandler middleware can handle it.
 *
 * Usage:
 *   const getUsers = asyncHandler(async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   });
 *
 * Without this, every controller would need its own try/catch. This keeps
 * controllers focused on the happy path — cleaner and easier to read.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

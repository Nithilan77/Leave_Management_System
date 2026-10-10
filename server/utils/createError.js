const mongoose = require('mongoose');

/**
 * createError
 * ------------
 * Builds an Error that carries an HTTP status code. Services throw these, and
 * controllers copy err.statusCode onto the response before re-throwing to the
 * central errorHandler — the same convention leaveService already uses
 * (err.statusCode = 400), just without repeating three lines every time.
 *
 *   throw createError('User not found', 404);
 */
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * assertValidId
 * --------------
 * Mongoose throws a CastError (which our errorHandler would report as a 500)
 * if you query with a malformed id like "abc". Checking up front lets us return
 * a clean 400 instead.
 */
const assertValidId = (id, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`Invalid ${label}`, 400);
  }
};

module.exports = { createError, assertValidId };

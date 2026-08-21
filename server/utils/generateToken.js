const jwt = require('jsonwebtoken');

/**
 * generateToken
 * --------------
 * Creates a signed JWT for a given user id. The token is what the client sends
 * back on every future request to prove who they are.
 *
 * What goes inside:
 *   - payload: { id } — the user's database id. We keep the payload minimal;
 *     never put secrets (like passwords) in a JWT, since the payload is only
 *     encoded (readable), not encrypted.
 *   - signed with JWT_SECRET so the server can later verify it wasn't tampered.
 *   - expiresIn from env so tokens don't live forever.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

module.exports = generateToken;

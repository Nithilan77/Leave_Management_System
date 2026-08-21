const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * protect
 * --------
 * Gatekeeper middleware for any route that requires a logged-in user.
 *
 * How it works:
 *   1. Read the token from the "Authorization: Bearer <token>" header.
 *   2. Verify it with our JWT_SECRET (this proves it's genuine & unexpired).
 *   3. Load the user from the DB and attach them to req.user, so downstream
 *      controllers know who is making the request.
 *
 * If anything is missing or invalid, respond 401 (Unauthorized) and stop.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]; // grab the part after "Bearer "
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    // Verify signature + expiry; returns the payload we signed ({ id }).
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user (minus password) to the request for later use.
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user no longer exists');
    }

    if (!req.user.isActive) {
      res.status(403);
      throw new Error('Account is deactivated');
    }

    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

/**
 * authorize(...roles)
 * --------------------
 * Role-Based Access Control (RBAC). Use AFTER `protect`. Pass the roles that
 * are allowed to access the route. If the logged-in user's role isn't in the
 * list, respond 403 (Forbidden).
 *
 * Example:
 *   router.get('/all-users', protect, authorize('hr'), getAllUsers);
 *   router.patch('/:id/approve', protect, authorize('manager', 'hr'), approve);
 *
 * This is why authorization lives on the BACKEND: the server is the source of
 * truth for permissions, not the frontend (which anyone could bypass).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied: this action requires role(s): ${roles.join(', ')}`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };

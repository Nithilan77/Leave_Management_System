const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * Auth controllers
 * -----------------
 * Thin handlers that deal with request/response. They call the User model for
 * data work and generateToken for issuing JWTs. Each is wrapped in asyncHandler
 * so any thrown error flows to our central error middleware.
 */

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Note: in a real org, HR usually creates accounts. We keep an open register
 * for development/testing convenience. You can later restrict role assignment
 * so users can't make themselves 'hr'.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, manager } = req.body;

  // Basic presence check (deeper validation added later with express-validator)
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  // Prevent duplicate accounts
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  // Password hashing happens automatically in the User model's pre-save hook.
  const user = await User.create({
    name,
    email,
    password,
    role,        // optional; defaults to 'employee' if omitted
    department,
    manager,
  });

  // Respond with the user's public info + a token so they're logged in.
  res.status(201).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    token: generateToken(user._id),
  });
});

/**
 * @desc    Log in an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Password is select:false in the schema, so we explicitly ask for it here.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Use the same generic message whether email or password is wrong, so we
  // don't reveal which one existed (a small but real security practice).
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account is deactivated. Contact HR.');
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    token: generateToken(user._id),
  });
});

/**
 * @desc    Get the currently logged-in user's profile
 * @route   GET /api/auth/me
 * @access  Private (requires a valid token)
 *
 * `protect` middleware already loaded the user into req.user, so we just return it.
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = { registerUser, loginUser, getMe };

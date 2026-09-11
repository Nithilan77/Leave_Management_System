import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute
 * ---------------
 * Wraps pages that require login. Optionally restricts by role — the frontend
 * mirror of the backend's RBAC (the backend is still the real gatekeeper; this
 * just avoids showing pages the user can't use).
 *
 * Usage:
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *   <ProtectedRoute roles={['hr']}><HRPanel /></ProtectedRoute>
 *
 * - Not logged in            -> redirect to /login
 * - Logged in, wrong role    -> redirect to /unauthorized (or home)
 * - Logged in, allowed       -> render the page
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useSelector((state) => state.auth);

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but role not permitted
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

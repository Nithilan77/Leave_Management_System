import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplyLeave from './pages/ApplyLeave';
import MyRequests from './pages/MyRequests';
import ProtectedRoute from './components/ProtectedRoute';
import HRDashboard from './pages/hr/HRDashboard';
import ManageUsers from './pages/hr/ManageUsers';
import LeaveTypes from './pages/hr/LeaveTypes';
import Reports from './pages/hr/Reports';

/**
 * App
 * ----
 * Route definitions. Public: /login. The employee pages are wrapped in
 * ProtectedRoute so only logged-in users can reach them.
 *
 * HR pages (/hr/...) pass roles={['hr']} so only HR users can open them
 * (the backend enforces the same rule with authorize('hr')).
 *
 * Manager (/manager) routes will be added by Muskan.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Employee pages */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/apply" element={<ProtectedRoute><ApplyLeave /></ProtectedRoute>} />
        <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />

        {/* HR pages */}
        <Route path="/hr" element={<ProtectedRoute roles={['hr']}><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/users" element={<ProtectedRoute roles={['hr']}><ManageUsers /></ProtectedRoute>} />
        <Route path="/hr/leave-types" element={<ProtectedRoute roles={['hr']}><LeaveTypes /></ProtectedRoute>} />
        <Route path="/hr/reports" element={<ProtectedRoute roles={['hr']}><Reports /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

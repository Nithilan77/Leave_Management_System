import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplyLeave from './pages/ApplyLeave';
import MyRequests from './pages/MyRequests';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * App
 * ----
 * Route definitions. Public: /login. The employee pages are wrapped in
 * ProtectedRoute so only logged-in users can reach them.
 *
 * Manager (/manager) and HR (/hr) routes will be added by Muskan and Mohnish.
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

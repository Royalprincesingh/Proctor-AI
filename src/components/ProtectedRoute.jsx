import { Navigate } from 'react-router-dom';
import { authHelpers } from '../services/api';

const ProtectedRoute = ({ children, requiredRole }) => {
  // Get current session using auth helpers
  const session = authHelpers.getCurrentSession();

  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/" replace />;
  }

  const { user } = session;

  // Check role requirements
  if (requiredRole === 'admin' && user.role !== 'admin') {
    // User is not admin, redirect to user dashboard
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'user' && user.role === 'admin') {
    // Admin trying to access user routes, redirect to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  // All checks passed, render the component
  return children;
};

export default ProtectedRoute;

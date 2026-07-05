import { Navigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';

/**
 * Wraps a route and redirects unauthenticated users to /login.
 * Pass requireSecretary={true} to block members without admin role
 * (secretary, president, or superAdmin).
 */
function ProtectedRoute({ children, requireSecretary = false }) {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireSecretary && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

import { Navigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';

/**
 * Wraps a route and redirects unauthenticated users to /login.
 * Pass requireAdmin to also block members without an admin role
 * (secretary, president or superAdmin). This only hides pages — the
 * security rules are what actually protect the data.
 */
function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

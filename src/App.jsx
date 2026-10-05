import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }   from './context/AuthContext';
import { ToastProvider }  from './context/ToastContext';
import ProtectedRoute     from './components/ProtectedRoute';
import Layout             from './components/Layout';
import LoginPage          from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import DashboardPage      from './pages/DashboardPage';
import ProfilePage        from './pages/ProfilePage';
import EventsPage         from './pages/EventsPage';
import MembersPage        from './pages/admin/MembersPage';
import AdminEventsPage    from './pages/admin/AdminEventsPage';
import AttendancePage     from './pages/admin/AttendancePage';
import PointsTablePage   from './pages/PointsTablePage';
import LeaderboardPage   from './pages/LeaderboardPage';
import OrientationPage   from './pages/OrientationPage';
import ProjectsPage      from './pages/ProjectsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            {/* Target of the password-reset / invite email link */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index           element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile"   element={<ProfilePage />} />
              <Route path="events"    element={<EventsPage />} />
              <Route path="projects"  element={<ProjectsPage />} />
              <Route path="points"    element={<PointsTablePage />} />
              <Route path="orientation" element={<OrientationPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />

              {/* Admins only (secretary, president, superAdmin) */}
              <Route
                path="admin/members"
                element={
                  <ProtectedRoute requireAdmin>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/events"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminEventsPage />
                  </ProtectedRoute>
                }
              />
              {/* Leaderboard moved to /leaderboard for all members; keep old links working */}
              <Route path="admin/leaderboard" element={<Navigate to="/leaderboard" replace />} />
              <Route
                path="admin/events/:eventId/attendance"
                element={
                  <ProtectedRoute requireAdmin>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

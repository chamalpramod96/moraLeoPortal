import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }   from './context/AuthContext';
import { ToastProvider }  from './context/ToastContext';
import ProtectedRoute     from './components/ProtectedRoute';
import Layout             from './components/Layout';
import LoginPage          from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage      from './pages/DashboardPage';
import ProfilePage        from './pages/ProfilePage';
import EventsPage         from './pages/EventsPage';
import MembersPage        from './pages/admin/MembersPage';
import AdminEventsPage    from './pages/admin/AdminEventsPage';
import AttendancePage     from './pages/admin/AttendancePage';
import PointsTablePage   from './pages/PointsTablePage';
import LeaderboardPage   from './pages/LeaderboardPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
              <Route path="points"    element={<PointsTablePage />} />

              {/* Secretary-only */}
              <Route
                path="admin/members"
                element={
                  <ProtectedRoute requireSecretary>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/events"
                element={
                  <ProtectedRoute requireSecretary>
                    <AdminEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/leaderboard"
                element={
                  <ProtectedRoute requireSecretary>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/events/:eventId/attendance"
                element={
                  <ProtectedRoute requireSecretary>
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

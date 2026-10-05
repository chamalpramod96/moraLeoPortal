import { Link }                         from 'react-router-dom';
import { useAuth }                      from '../context/AuthContext';
import { useMemberActivity }            from '../hooks/useMemberActivity';
import Badge                             from '../components/Badge';
import LoadingSpinner                    from '../components/LoadingSpinner';
import StatCard                          from '../components/StatCard';
import ProfilePhotoPicker                from '../components/ProfilePhotoPicker';
import { formatDateShort, calcAttendanceRate, rateColor } from '../utils/helpers';
import { isAttended }                    from '../data/pointsConfig';

function DashboardPage() {
  const { memberData } = useAuth();
  // Total = events + project roles (+ any manual points), same as Leaderboard
  const { events, attendance, points, loading } = useMemberActivity(memberData?.email);

  // Rate over the events this member was marked for (same as Profile and the
  // Word export) — not all events, which would count future/unmarked ones.
  const attendedCount  = attendance.filter(a => isAttended(a.status)).length;
  const attendanceRate = calcAttendanceRate(attendedCount, attendance.length);

  // Last 5 events with member status
  const recentEvents = events.slice(0, 5).map(ev => ({
    ...ev,
    myStatus: attendance.find(a => a.eventId === ev.id)?.status ?? 'not marked',
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* ── Welcome card ──────────────────────────────────────────── */}
      <div className="card-gold rounded-xl p-6">
        <div className="flex items-start gap-4">
          <ProfilePhotoPicker size="md" />

          <div className="min-w-0">
            <p className="text-portal-muted text-xs">Welcome back,</p>
            <h1 className="text-xl font-bold text-portal-text truncate">{memberData?.fullName}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span className="text-portal-gold text-sm">{memberData?.position || 'Member'}</span>
              <span className="text-portal-muted text-xs">·</span>
              <span className="text-portal-muted text-xs">Term {memberData?.term}</span>
              <span className="text-portal-muted text-xs">·</span>
              <span className="text-portal-muted text-xs font-mono">{memberData?.memberId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={attendance.length} label="My Events"   color="text-portal-gold" />
        <StatCard value={attendedCount}  label="Attended"       color="text-green-400"   />
        <StatCard value={`${attendanceRate}%`} label="Rate"    color={rateColor(attendanceRate, attendance.length > 0)} />
      </div>

      {/* ── Level & Points card ───────────────────────────────────── */}
      <div className="card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-trophy text-portal-gold" />
            Mora Connect Points
          </h2>
          <Link to="/points" className="text-portal-gold text-xs hover:text-portal-gold-light">
            View table <i className="fa-solid fa-arrow-right ml-1" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold text-portal-text">{points.total.toLocaleString()}</p>
              <Link to="/profile" className="text-xs text-portal-muted hover:text-portal-gold mt-0.5 inline-block">
                See how you earned them <i className="fa-solid fa-arrow-right ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent events ─────────────────────────────────────────── */}
      <div className="card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-portal-text">Recent Events</h2>
          <Link to="/events" className="text-portal-gold text-xs hover:text-portal-gold-light">
            View all <i className="fa-solid fa-arrow-right ml-1" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <p className="text-portal-muted text-sm text-center py-6">No events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map(ev => (
              <div
                key={ev.id}
                className="flex items-center justify-between px-3 py-2.5 bg-portal-bg
                           rounded-lg border border-subtle hover:bg-portal-hover transition-colors"
              >
                <div className="min-w-0 mr-3">
                  <p className="text-portal-text text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-portal-muted text-xs mt-0.5">
                    {formatDateShort(ev.date)}
                    {ev.location && ` · ${ev.location}`}
                  </p>
                </div>
                <Badge status={ev.myStatus} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: '/profile', icon: 'fa-user',      label: 'My Profile'       },
          { to: '/events',  icon: 'fa-calendar',  label: 'All Events'       },
          { to: '/profile', icon: 'fa-file-word', label: 'Download Profile' },
        ].map(({ to, icon, label }) => (
          <Link
            key={label}
            to={to}
            className="card rounded-xl p-4 flex flex-col items-center gap-2
                       hover:bg-portal-hover transition-colors group"
          >
            <i className={`fa-solid ${icon} text-portal-gold text-xl group-hover:scale-110 transition-transform`} />
            <span className="text-portal-muted text-xs text-center group-hover:text-portal-text transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;

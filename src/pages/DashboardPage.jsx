import { useState, useEffect }         from 'react';
import { Link }                         from 'react-router-dom';
import { useAuth }                      from '../context/AuthContext';
import { getEvents, getMemberAttendance } from '../services/eventService';
import { getMemberManualPoints, computeMemberPoints } from '../services/pointsService';
import { useProfilePhoto }              from '../hooks/useProfilePhoto';
import Badge                             from '../components/Badge';
import LoadingSpinner                    from '../components/LoadingSpinner';
import { formatDateShort, calcAttendanceRate, rateColor, memberKey, PHOTO_ACCEPT } from '../utils/helpers';
import { getProjects }                   from '../services/projectService';
import { isAttended }                    from '../data/pointsConfig';

function StatCard({ value, label, color = 'text-portal-gold' }) {
  return (
    <div className="card rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-portal-muted text-xs mt-1">{label}</div>
    </div>
  );
}

function DashboardPage() {
  const { memberData } = useAuth();
  const { uploading, inputRef: photoInputRef, handleChange: handlePhotoChange } = useProfilePhoto();
  const [events,     setEvents]     = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [manualPts,  setManualPts]  = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [myKey,      setMyKey]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Keyed on email so a profile-photo change doesn't refetch everything
  const email = memberData?.email;
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const [evList, attList, mp, projList, key] = await Promise.all([
          getEvents(),
          getMemberAttendance(email),
          getMemberManualPoints(email),
          getProjects(),
          memberKey(email),
        ]);
        setEvents(evList);
        setAttendance(attList);
        setManualPts(mp);
        setProjects(projList);
        setMyKey(key);
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  // Rate over the events this member was marked for (same as Profile and the
  // Word export) — not all events, which would count future/unmarked ones.
  const attendedCount  = attendance.filter(a => isAttended(a.status)).length;
  const attendanceRate = calcAttendanceRate(attendedCount, attendance.length);

  // Total = events + project roles (+ any manual points), same as Leaderboard
  const points = computeMemberPoints(memberData?.email ?? '', attendance, events, manualPts, projects, myKey);

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
          {/* Avatar — click to change photo */}
          <div
            className="relative w-16 h-16 rounded-full bg-portal-red/20 border-2 border-portal-gold/40
                        flex items-center justify-center flex-shrink-0 overflow-hidden
                        cursor-pointer group"
            onClick={() => !uploading && photoInputRef.current?.click()}
            title="Change profile photo"
          >
            {memberData?.profilePhoto
              ? <img src={memberData.profilePhoto} alt="" className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-portal-gold">
                  {memberData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
            }
            <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {uploading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><i className="fa-solid fa-camera text-white text-sm" />
                    <span className="text-white text-[9px] mt-0.5 font-medium">Change</span></>
              }
            </div>
          </div>
          {/* Hidden file input */}
          <input ref={photoInputRef} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={handlePhotoChange} />

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

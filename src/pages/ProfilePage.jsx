import { useState, useEffect } from 'react';
import { useAuth }             from '../context/AuthContext';
import { getEvents, getMemberAttendance } from '../services/eventService';
import { getMemberManualPoints, computeMemberPoints, projectRolesFor, eventPointsFor } from '../services/pointsService';
import { getProjects } from '../services/projectService';
import { sendSetPasswordEmail } from '../services/memberService';
import { useProfilePhoto }       from '../hooks/useProfilePhoto';
import { useToast }            from '../context/ToastContext';
import Badge                   from '../components/Badge';
import LoadingSpinner          from '../components/LoadingSpinner';
import { getManualCategory, isAttended } from '../data/pointsConfig';
import { formatDate, formatDateShort, calcAttendanceRate, rateColor, memberKey, PHOTO_ACCEPT } from '../utils/helpers';

function ProfilePage() {
  const { memberData }       = useAuth();
  const { showToast }        = useToast();
  const { uploading, inputRef: photoInputRef, handleChange: handlePhotoChange } = useProfilePhoto();
  const [events,      setEvents]      = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [manualPts,   setManualPts]   = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [myKey,       setMyKey]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pwSending,   setPwSending]   = useState(false);

  // Keyed on email so a profile-photo change doesn't reload the whole page
  const email = memberData?.email;
  useEffect(() => {
    if (!email) return;
    (async () => {
      setLoading(true);
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Loaded on demand: the Word library is ~90 KB that most visits never use
      const { downloadMemberProfile } = await import('../services/wordExport');
      await downloadMemberProfile(memberData, events, attendance);
      showToast('Profile downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate document. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Password changes go through Firebase's emailed link, which proves the
  // person owns the inbox and needs no current-password prompt here.
  const handleChangePassword = async () => {
    setPwSending(true);
    try {
      await sendSetPasswordEmail(memberData.email);
      showToast(`We emailed a change-password link to ${memberData.email}. Check spam if you don't see it.`, 'success');
    } catch {
      showToast('Failed to send the email. Please try again.', 'error');
    } finally {
      setPwSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const attended  = attendance.filter(a => isAttended(a.status)).length;
  const rate      = calcAttendanceRate(attended, attendance.length);

  // Total = events + project roles (+ any manual points), same as Leaderboard
  const points  = computeMemberPoints(memberData?.email ?? '', attendance, events, manualPts, projects, myKey);
  const myRoles = projectRolesFor(myKey, projects);

  // Join attendance with events
  const attWithEvent = attendance.map(rec => ({
    ...rec,
    event: events.find(e => e.id === rec.eventId),
  })).sort((a, b) => {
    const dA = a.event?.date?.toDate?.() ?? new Date(0);
    const dB = b.event?.date?.toDate?.() ?? new Date(0);
    return dB - dA;
  });

  const profileFields = [
    { label: 'Member ID',  value: memberData?.memberId   },
    { label: 'Full Name',  value: memberData?.fullName   },
    { label: 'Email',      value: memberData?.email      },
    { label: 'Phone',      value: memberData?.phone      },
    { label: 'Position',   value: memberData?.position   },
    { label: 'Term',       value: memberData?.term       },
    { label: 'Join Date',  value: formatDate(memberData?.joinDate) },
  ];

  return (
    <div className="space-y-6">
      {/* ── Profile card ──────────────────────────────────────────── */}
      <div className="card-gold rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar — click to change photo */}
          <div
            className="relative w-20 h-20 rounded-full bg-portal-red/20 border-2 border-portal-gold/50
                        flex items-center justify-center flex-shrink-0 overflow-hidden self-center
                        cursor-pointer group"
            onClick={() => !uploading && photoInputRef.current?.click()}
            title="Change profile photo"
          >
            {memberData?.profilePhoto
              ? <img src={memberData.profilePhoto} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl font-bold text-portal-gold">
                  {memberData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
            }
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {uploading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>
                    <i className="fa-solid fa-camera text-white text-base" />
                    <span className="text-white text-[9px] mt-0.5 font-medium">Change</span>
                  </>
              }
            </div>
          </div>
          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div className="flex-1">
            <h1 className="text-xl font-bold text-portal-text">{memberData?.fullName}</h1>
            <p className="text-portal-gold text-sm mt-0.5">{memberData?.position || 'Member'}</p>
            <p className="text-portal-muted text-xs font-mono mt-1">{memberData?.memberId}</p>
          </div>

          {/* Change password + download buttons */}
          <div className="flex flex-wrap gap-2 justify-center self-center sm:self-auto">
            <button
              onClick={handleChangePassword}
              disabled={pwSending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                         border border-white/10 text-portal-muted hover:text-portal-text
                         hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className={`fa-solid ${pwSending ? 'fa-spinner fa-spin' : 'fa-key'}`} />
              Change Password
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                         border border-portal-gold/50 text-portal-gold
                         hover:bg-portal-gold/10 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-portal-gold/30 border-t-portal-gold rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-word" />
                  Download Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-6 pt-5 border-t border-subtle">
          {profileFields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-portal-muted text-xs uppercase tracking-wide">{label}</p>
              <p className="text-portal-text text-sm mt-0.5">{value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attendance summary stats ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-portal-gold">{attendance.length}</div>
          <div className="text-portal-muted text-xs mt-1">Total</div>
        </div>
        <div className="card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{attended}</div>
          <div className="text-portal-muted text-xs mt-1">Attended</div>
        </div>
        <div className="card rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${rateColor(rate, attendance.length > 0)}`}>{rate}%</div>
          <div className="text-portal-muted text-xs mt-1">Rate</div>
        </div>
      </div>
      {/* ── Mora Connect Points ──────────────────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-subtle">
          <h2 className="font-semibold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-trophy text-portal-gold" />
            Mora Connect Points — how you earned them
          </h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-3xl font-bold text-portal-text">{points.total.toLocaleString()}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-subtle text-portal-muted">
                <i className="fa-solid fa-calendar-check text-portal-gold mr-1" />
                Events <strong className="text-portal-text">{points.eventPoints.toLocaleString()}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-subtle text-portal-muted">
                <i className="fa-solid fa-diagram-project text-portal-gold mr-1" />
                Projects <strong className="text-portal-text">{points.projectPoints.toLocaleString()}</strong>
              </span>
              {points.manualPoints > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-subtle text-portal-muted">
                  <i className="fa-solid fa-award text-portal-gold mr-1" />
                  Awards <strong className="text-portal-text">{points.manualPoints.toLocaleString()}</strong>
                </span>
              )}
            </div>
            <p className="text-xs text-portal-muted mt-2">
              Event points are listed per event in your Attendance History below.
            </p>
          </div>

          {/* Project roles */}
          <div>
            <p className="text-xs text-portal-muted uppercase tracking-widest mb-2">Project Roles</p>
            {myRoles.length === 0 ? (
              <p className="text-sm text-portal-muted italic">No project roles yet.</p>
            ) : (
              <div className="rounded-lg overflow-hidden border border-subtle">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-subtle">
                      <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wide">Project</th>
                      <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wide">Role</th>
                      <th className="px-4 py-2.5 text-right text-portal-muted text-xs uppercase tracking-wide">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {myRoles.map(r => (
                      <tr key={`${r.projectId}-${r.role}`} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-portal-text">{r.projectName}</td>
                        <td className="px-4 py-2.5 text-portal-muted">{r.roleLabel}</td>
                        <td className="px-4 py-2.5 text-right text-portal-gold font-bold">+{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Awards / manual points (only shown if any were given) */}
          {manualPts.length > 0 && (
            <div>
              <p className="text-xs text-portal-muted uppercase tracking-widest mb-2">Awards</p>
              <div className="rounded-lg overflow-hidden border border-subtle">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-subtle">
                      <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wide">Category</th>
                      <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2.5 text-right text-portal-muted text-xs uppercase tracking-wide">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {manualPts.map(mp => {
                      const cat = getManualCategory(mp.categoryId);
                      return (
                        <tr key={mp.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-portal-muted text-xs">{cat?.label ?? mp.categoryId}</td>
                          <td className="px-4 py-2.5 text-portal-text">{mp.description || '—'}</td>
                          <td className="px-4 py-2.5 text-right text-portal-gold font-bold">+{mp.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Attendance history table ───────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-subtle">
          <h2 className="font-semibold text-portal-text">Attendance History</h2>
        </div>

        {attWithEvent.length === 0 ? (
          <p className="text-portal-muted text-sm text-center py-10">
            No attendance records yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle">
                  {['Event', 'Date', 'Category', 'Status', 'Points'].map(h => (
                    <th key={h} className={`px-5 py-3 text-portal-muted text-xs uppercase tracking-wide font-medium
                                            ${h === 'Points' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attWithEvent.map((rec, i) => (
                  <tr
                    key={rec.id}
                    className={`border-b border-subtle last:border-0 hover:bg-portal-hover transition-colors
                                ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="px-5 py-3 text-portal-text font-medium">
                      {rec.event?.title ?? 'Unknown Event'}
                    </td>
                    <td className="px-5 py-3 text-portal-muted whitespace-nowrap">
                      {formatDateShort(rec.event?.date)}
                    </td>
                    <td className="px-5 py-3 text-portal-muted">
                      {rec.event?.category ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge status={rec.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-bold whitespace-nowrap">
                      {(() => {
                        const pts = eventPointsFor(rec.status, rec.event);
                        return pts > 0
                          ? <span className="text-portal-gold">+{pts}</span>
                          : <span className="text-portal-muted font-normal">—</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;

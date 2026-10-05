import { useState }            from 'react';
import { useAuth }             from '../context/AuthContext';
import { useToast }            from '../context/ToastContext';
import { useMemberActivity }   from '../hooks/useMemberActivity';
import { projectRolesFor, eventPointsFor } from '../domain/points';
import { sendSetPasswordEmail } from '../services/memberService';
import Badge                   from '../components/Badge';
import LoadingSpinner, { InlineSpinner } from '../components/LoadingSpinner';
import StatCard                from '../components/StatCard';
import ProfilePhotoPicker      from '../components/ProfilePhotoPicker';
import { getManualCategory, isAttended } from '../data/pointsConfig';
import { formatDate, formatDateShort, calcAttendanceRate, rateColor } from '../utils/helpers';

function ProfilePage() {
  const { memberData }       = useAuth();
  const { showToast }        = useToast();
  // Total = events + project roles (+ any manual points), same as Leaderboard
  const {
    events, attendance, manualPoints: manualPts, projects, key: myKey, points, loading,
  } = useMemberActivity(memberData?.email);
  const [downloading, setDownloading] = useState(false);
  const [pwSending,   setPwSending]   = useState(false);

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
  const myRoles   = projectRolesFor(myKey, projects);

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
          <ProfilePhotoPicker size="lg" className="self-center" />

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
                  <InlineSpinner size="w-4 h-4" gold />
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
        <StatCard size="text-2xl" value={attendance.length} label="Total" />
        <StatCard size="text-2xl" value={attended} label="Attended" color="text-green-400" />
        <StatCard size="text-2xl" value={`${rate}%`} label="Rate" color={rateColor(rate, attendance.length > 0)} />
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

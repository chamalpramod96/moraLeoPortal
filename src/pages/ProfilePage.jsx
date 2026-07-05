import { useState, useEffect } from 'react';
import { useAuth }             from '../context/AuthContext';
import { getEvents, getMemberAttendance } from '../services/eventService';
import { getMemberManualPoints, calcEventPoints, calcManualPoints } from '../services/pointsService';
import { downloadMemberProfile } from '../services/wordExport';
import { useProfilePhoto }       from '../hooks/useProfilePhoto';
import { useToast }            from '../context/ToastContext';
import Badge                   from '../components/Badge';
import LoadingSpinner          from '../components/LoadingSpinner';
import { getLevelInfo }        from '../data/pointsConfig';
import { getManualCategory }   from '../data/pointsConfig';
import { formatDate, formatDateShort, calcAttendanceRate } from '../utils/helpers';

function ProfilePage() {
  const { memberData }       = useAuth();
  const { showToast }        = useToast();
  const { uploading, inputRef: photoInputRef, handleChange: handlePhotoChange } = useProfilePhoto();
  const [events,      setEvents]      = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [manualPts,   setManualPts]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!memberData) return;
    (async () => {
      setLoading(true);
      try {
        const [evList, attList, mp] = await Promise.all([
          getEvents(),
          getMemberAttendance(memberData.email),
          getMemberManualPoints(memberData.email),
        ]);
        setEvents(evList);
        setAttendance(attList);
        setManualPts(mp);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMemberProfile(memberData, events, attendance);
      showToast('Profile downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate document. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const attended  = attendance.filter(a => a.status === 'attended').length;
  const rate      = calcAttendanceRate(attended, attendance.length);

  const totalEventPts  = calcEventPoints(memberData?.email ?? '', attendance, events);
  const totalManualPts = calcManualPoints(memberData?.email ?? '', manualPts);
  const totalPoints    = totalEventPts + totalManualPts;
  const { current: lvl, next: nextLvl, progressPct } = getLevelInfo(totalPoints);

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
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div className="flex-1">
            <h1 className="text-xl font-bold text-portal-text">{memberData?.fullName}</h1>
            <p className="text-portal-gold text-sm mt-0.5">{memberData?.position || 'Member'}</p>
            <p className="text-portal-muted text-xs font-mono mt-1">{memberData?.memberId}</p>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                       border border-portal-gold/50 text-portal-gold
                       hover:bg-portal-gold/10 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors self-center sm:self-auto"
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
          <div className="text-2xl font-bold text-portal-red">{rate}%</div>
          <div className="text-portal-muted text-xs mt-1">Rate</div>
        </div>
      </div>
      {/* ── Mora Miglioria Points ──────────────────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-subtle flex items-center justify-between">
          <h2 className="font-semibold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-trophy text-portal-gold" />
            Mora Miglioria Points
          </h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold
                           ${lvl.border ?? lvl.borderClass ?? 'border-gray-600'}
                           ${lvl.bg ?? lvl.bgClass} ${lvl.color ?? lvl.colorClass}`}>
            <i className="fa-solid fa-star opacity-70" />{lvl.label}
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Total + progress */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-3xl font-bold text-portal-text">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-portal-muted mt-0.5">
                {totalEventPts.toLocaleString()} event attendance pts
                &nbsp;·&nbsp;
                {totalManualPts.toLocaleString()} manual / other pts
              </p>
            </div>
            {nextLvl && (
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-portal-muted mb-1">
                  <span>{lvl.label}</span>
                  <span className={nextLvl.color ?? nextLvl.colorClass}>{nextLvl.label}</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700
                                ${(lvl.color ?? lvl.colorClass).replace('text-', 'bg-')}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-portal-muted mt-1">
                  {(nextLvl.minPoints - totalPoints).toLocaleString()} pts to {nextLvl.label}
                </p>
              </div>
            )}
          </div>

          {/* Manual points breakdown */}
          {manualPts.length > 0 && (
            <div>
              <p className="text-xs text-portal-muted uppercase tracking-widest mb-2">Manual / Other Points History</p>
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
                  {['Event', 'Date', 'Category', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-portal-muted text-xs uppercase tracking-wide font-medium">
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

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth }               from '../../context/AuthContext';
import { getEvent, getAttendanceForEvent, saveEventAttendance } from '../../services/eventService';
import { getMembers }            from '../../services/memberService';
import { useToast }              from '../../context/ToastContext';
import LoadingSpinner            from '../../components/LoadingSpinner';
import { formatDate }            from '../../utils/helpers';
import { getEventCategory }      from '../../data/pointsConfig';

const STATUSES = ['attended', 'absent', 'excused'];

const STATUS_STYLES = {
  attended: 'bg-green-900/40 border-green-600/40 text-green-400',
  absent:   'bg-red-900/40   border-red-600/40   text-red-400',
  excused:  'bg-yellow-900/40 border-yellow-600/40 text-yellow-400',
};

const STATUS_ICONS = {
  attended: 'fa-circle-check',
  absent:   'fa-circle-xmark',
  excused:  'fa-circle-minus',
};

function AttendancePage() {
  const { eventId }        = useParams();
  const { memberData: me } = useAuth();
  const { showToast }      = useToast();
  const navigate           = useNavigate();

  const [event,          setEvent]       = useState(null);
  const [baseMembers,    setBaseMembers] = useState([]);
  const [statusMap,      setStatusMap]   = useState({});
  const [loading,        setLoading]     = useState(true);
  const [saving,         setSaving]      = useState(false);

  // Always reflect the logged-in user's latest data (profile photo etc.)
  const members = useMemo(
    () => baseMembers.map(m => m.email === me?.email ? { ...m, ...me } : m),
    [baseMembers, me]
  );

  useEffect(() => {
    (async () => {
      try {
        const [ev, mems, existing] = await Promise.all([
          getEvent(eventId),
          getMembers(),
          getAttendanceForEvent(eventId),
        ]);

        setEvent(ev);

        const active = mems.filter(m => m.isActive);
        setBaseMembers(active);

        // Build initial status map: use existing records, default to 'absent'
        const map = {};
        active.forEach(m => {
          const rec = existing.find(a => a.memberId === m.email);
          map[m.email] = rec?.status ?? 'absent';
        });
        setStatusMap(map);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const cycleStatus = (email) => {
    setStatusMap(prev => {
      const cur = prev[email] ?? 'absent';
      const idx = STATUSES.indexOf(cur);
      return { ...prev, [email]: STATUSES[(idx + 1) % STATUSES.length] };
    });
  };

  const setAllAttended = () => {
    setStatusMap(prev => {
      const next = { ...prev };
      members.forEach(m => { next[m.email] = 'attended'; });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = members.map(m => ({
        memberId: m.email,
        status:   statusMap[m.email] ?? 'absent',
      }));
      await saveEventAttendance(eventId, records, me.email);
      showToast('Attendance saved successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!event)  return (
    <div className="text-center py-16 text-portal-muted">
      Event not found.{' '}
      <button onClick={() => navigate('/admin/events')} className="text-portal-gold hover:underline">
        Go back
      </button>
    </div>
  );

  const counts = {
    attended: Object.values(statusMap).filter(s => s === 'attended').length,
    absent:   Object.values(statusMap).filter(s => s === 'absent').length,
    excused:  Object.values(statusMap).filter(s => s === 'excused').length,
  };

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/admin/events')}
          className="text-portal-muted hover:text-portal-gold text-sm mb-3 flex items-center gap-1 transition-colors"
        >
          <i className="fa-solid fa-arrow-left" /> Back to Events
        </button>

        <h1 className="text-xl font-bold text-portal-text">{event.title}</h1>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-portal-muted">
          <span><i className="fa-solid fa-calendar mr-1" />{formatDate(event.date)}</span>
          {event.location && <span><i className="fa-solid fa-location-dot mr-1" />{event.location}</span>}
          <span className="text-portal-gold">{event.category}</span>
        </div>
        {/* Points info banner */}
        {event.pointsCategory ? (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                          bg-portal-gold/10 border border-portal-gold/30 text-portal-gold text-sm">
            <i className="fa-solid fa-trophy" />
            Attendance earns <strong>{event.pointsValue ?? 0} points</strong>
            <span className="text-portal-muted text-xs">
              ({getEventCategory(event.pointsCategory)?.label ?? event.pointsCategory})
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-portal-muted italic">
            <i className="fa-solid fa-info-circle mr-1" />No points configured for this event.
          </p>
        )}

        {/* Photos / Sign Sheet */}
        {event.photos?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {event.photos.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={p.url}
                    alt={p.type === 'signsheet' ? 'Sign Sheet' : 'Event Photo'}
                    className="h-28 rounded-lg border border-subtle object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                                  ${p.type === 'signsheet'
                                    ? 'bg-portal-gold/20 text-portal-gold border border-portal-gold/40'
                                    : 'bg-white/10 text-portal-muted'}`}>
                  {p.type === 'signsheet' ? '📋 Sign Sheet' : '📷 Event Photo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats + Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Stat pills */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-600/30">
            <i className="fa-solid fa-circle-check text-green-400 text-sm" />
            <span className="text-green-400 text-sm font-medium">{counts.attended} Attended</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-600/30">
            <i className="fa-solid fa-circle-xmark text-red-400 text-sm" />
            <span className="text-red-400 text-sm font-medium">{counts.absent} Absent</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-900/30 border border-yellow-600/30">
            <i className="fa-solid fa-circle-minus text-yellow-400 text-sm" />
            <span className="text-yellow-400 text-sm font-medium">{counts.excused} Excused</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 sm:ml-auto">
          <button onClick={setAllAttended}
            className="border border-portal-gold/35 text-portal-gold hover:bg-portal-gold/10
                       px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-check-double" /> All Attended
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                       font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
            {saving
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              : <><i className="fa-solid fa-floppy-disk" />Save</>
            }
          </button>
        </div>
      </div>

      {/* ── Member list ─────────────────────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-subtle text-xs text-portal-muted uppercase tracking-wide font-medium">
          {members.length} Active Members — click status to cycle between Attended → Absent → Excused
        </div>

        {members.length === 0 ? (
          <p className="text-center py-10 text-portal-muted text-sm">No active members found.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {members.map(m => {
              const status = statusMap[m.email] ?? 'absent';
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3
                             hover:bg-portal-hover transition-colors"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/30
                                    flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {m.profilePhoto
                        ? <img src={m.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-portal-gold">
                            {m.fullName?.charAt(0)?.toUpperCase()}
                          </span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-portal-text text-sm font-medium truncate">{m.fullName}</p>
                      <p className="text-portal-muted text-xs">{m.position || 'Member'}</p>
                    </div>
                  </div>

                  {/* Status toggle buttons */}
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusMap(prev => ({ ...prev, [m.email]: s }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                    border transition-all
                                    ${status === s
                                      ? STATUS_STYLES[s]
                                      : 'border-white/5 text-portal-muted hover:border-white/20'
                                    }`}
                      >
                        <i className={`fa-solid ${STATUS_ICONS[s]}`} />
                        <span className="hidden sm:inline">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button (bottom sticky) */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                     font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2
                     transition-colors shadow-2xl shadow-portal-red/30">
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            : <><i className="fa-solid fa-floppy-disk" />Save Attendance</>
          }
        </button>
      </div>
    </div>
  );
}

export default AttendancePage;

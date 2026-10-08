import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth }               from '../../context/AuthContext';
import { getEvent, getAttendanceForEvent, saveEventAttendance } from '../../services/eventService';
import { getMembers }            from '../../services/memberService';
import { useToast }              from '../../context/ToastContext';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import LoadingSpinner, { InlineSpinner } from '../../components/LoadingSpinner';
import MemberAvatar              from '../../components/MemberAvatar';
import { formatDate, safeHttpsUrl } from '../../utils/helpers';
import { getEventCategory, isHybridEvent, isAttended } from '../../data/pointsConfig';
import { matchMembers }          from '../../domain/memberSearch';

// Hybrid club meetings record *how* a member attended: Physical earns the full
// points, Online earns the event's online points.
const STATUSES        = ['attended', 'absent', 'excused'];
const HYBRID_STATUSES = ['attended', 'attended_online', 'absent', 'excused'];

const STATUS_LABELS = {
  attended: 'Attended', attended_online: 'Online', absent: 'Absent', excused: 'Excused',
};
const HYBRID_LABELS = { ...STATUS_LABELS, attended: 'Physical' };

const STATUS_STYLES = {
  attended:        'bg-green-900/40 border-green-600/40 text-green-400',
  attended_online: 'bg-sky-900/40   border-sky-600/40   text-sky-400',
  absent:          'bg-red-900/40   border-red-600/40   text-red-400',
  excused:         'bg-yellow-900/40 border-yellow-600/40 text-yellow-400',
};

const STATUS_ICONS = {
  attended:        'fa-circle-check',
  attended_online: 'fa-laptop',
  absent:          'fa-circle-xmark',
  excused:         'fa-circle-minus',
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
  // Quick mark: type a name, press Enter to mark the first match present
  const [query,          setQuery]       = useState('');
  const [presentOnly,    setPresentOnly] = useState(false);
  const [lastMarked,     setLastMarked]  = useState(null);   // { name, status }
  const searchRef = useRef(null);

  // Always reflect the logged-in user's latest data (profile photo etc.)
  const members = useMemo(
    () => baseMembers.map(m => m.email === me?.email ? { ...m, ...me } : m),
    [baseMembers, me]
  );

  // The rows shown: search matches (best first), optionally only those marked present
  const visible = useMemo(() => {
    const list = query.trim() ? matchMembers(members, query) : members;
    return presentOnly ? list.filter(m => isAttended(statusMap[m.email])) : list;
  }, [members, query, presentOnly, statusMap]);

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

        // Build initial status map: use existing records, default to 'absent'.
        // If the event is no longer hybrid, an "online" mark shows as attended.
        const hybrid = isHybridEvent(ev);
        const map = {};
        active.forEach(m => {
          const rec = existing.find(a => a.memberId === m.email);
          const status = rec?.status ?? 'absent';
          map[m.email] = !hybrid && status === 'attended_online' ? 'attended' : status;
        });
        setStatusMap(map);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const setAllAttended = () => {
    setStatusMap(prev => {
      const next = { ...prev };
      members.forEach(m => { next[m.email] = 'attended'; });
      return next;
    });
  };

  const setStatus = (email, status) => setStatusMap(prev => ({ ...prev, [email]: status }));

  // Enter marks the first match; Shift+Enter marks Online at a hybrid meeting
  const handleSearchKey = (e) => {
    if (e.key === 'Escape') { setQuery(''); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const m = query.trim() && visible[0];
    if (!m) return;
    const status = e.shiftKey && isHybridEvent(event) ? 'attended_online' : 'attended';
    setStatus(m.email, status);
    setLastMarked({ name: m.fullName, status });
    setQuery('');
    searchRef.current?.focus();
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
      refreshLeaderboardSoon();
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

  const hybrid   = isHybridEvent(event);
  const statuses = hybrid ? HYBRID_STATUSES : STATUSES;
  const labels   = hybrid ? HYBRID_LABELS : STATUS_LABELS;
  const counts   = { attended: 0, attended_online: 0, absent: 0, excused: 0 };
  Object.values(statusMap).forEach(s => { if (s in counts) counts[s]++; });

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
            {hybrid
              ? <span>Physical earns <strong>{event.pointsValue ?? 0}</strong> · Online earns{' '}
                  <strong>{event.onlinePointsValue ?? getEventCategory(event.pointsCategory)?.onlinePoints ?? 0}</strong> points</span>
              : <span>Attendance earns <strong>{event.pointsValue ?? 0} points</strong></span>}
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
                <a href={safeHttpsUrl(p.url)} target="_blank" rel="noopener noreferrer">
                  <img
                    src={safeHttpsUrl(p.url)}
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
            <span className="text-green-400 text-sm font-medium">{counts.attended} {labels.attended}</span>
          </div>
          {hybrid && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-900/30 border border-sky-600/30">
              <i className="fa-solid fa-laptop text-sky-400 text-sm" />
              <span className="text-sky-400 text-sm font-medium">{counts.attended_online} Online</span>
            </div>
          )}
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
            <i className="fa-solid fa-check-double" /> {hybrid ? 'All Physical' : 'All Attended'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                       font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
            {saving
              ? <><InlineSpinner />Saving…</>
              : <><i className="fa-solid fa-floppy-disk" />Save</>
            }
          </button>
        </div>
      </div>

      {/* ── Quick mark: search by name ──────────────────────────────── */}
      <div className="card-gold rounded-xl p-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                           text-portal-muted/60 text-sm pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Type a name to mark them present…"
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-portal-bg border border-white/10 rounded-lg pl-9 pr-9 py-2.5
                         text-portal-text placeholder-portal-muted/50 text-sm
                         focus:outline-none focus:border-portal-gold/60 transition-colors"
            />
            {query && (
              <button type="button" title="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-portal-muted hover:text-portal-text p-1">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-portal-muted cursor-pointer select-none flex-shrink-0">
            <input type="checkbox" checked={presentOnly} onChange={e => setPresentOnly(e.target.checked)}
              className="accent-portal-gold" />
            Show only members marked present
          </label>
        </div>
        <p className="text-xs text-portal-muted">
          {lastMarked && (
            <span className={`mr-2 font-medium ${lastMarked.status === 'attended_online' ? 'text-sky-400' : 'text-green-400'}`}>
              <i className="fa-solid fa-circle-check mr-1" />
              {lastMarked.name} — {labels[lastMarked.status]}
            </span>
          )}
          Press <strong className="text-portal-text">Enter</strong> to mark the first match
          {hybrid ? <> <strong className="text-portal-text">Physical</strong> (Shift + Enter for Online)</> : ' as attended'}.
          Members you don't mark stay Absent. Remember to Save.
        </p>
      </div>

      {/* ── Member list ─────────────────────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-subtle text-xs text-portal-muted uppercase tracking-wide font-medium">
          {visible.length === members.length
            ? `${members.length} Active Members`
            : `Showing ${visible.length} of ${members.length} members`} — choose each member's status
          {hybrid && ' (Physical or Online for this hybrid meeting)'}
        </div>

        {members.length === 0 ? (
          <p className="text-center py-10 text-portal-muted text-sm">No active members found.</p>
        ) : visible.length === 0 ? (
          <p className="text-center py-10 text-portal-muted text-sm">
            {query.trim() ? `No members match “${query.trim()}”.` : 'No members are marked present yet.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {visible.map((m, i) => {
              const status   = statusMap[m.email] ?? 'absent';
              const isTarget = query.trim() && i === 0;   // what Enter will mark
              return (
                <div
                  key={m.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-0
                              px-4 sm:px-5 py-3 hover:bg-portal-hover transition-colors
                              ${isTarget ? 'bg-portal-gold/[0.07]' : ''}`}
                >
                  {/* Member info (on phones the buttons go underneath, so the name has room) */}
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar member={m} />
                    <div className="min-w-0">
                      <p className="text-portal-text text-sm font-medium break-words sm:truncate">
                        {m.fullName}
                        {isTarget && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-portal-gold
                                           border border-portal-gold/40 rounded px-1.5 py-0.5 align-middle">
                            Enter ↵
                          </span>
                        )}
                      </p>
                      <p className="text-portal-muted text-xs">{m.position || 'Member'}</p>
                    </div>
                  </div>

                  {/* Status toggle buttons */}
                  <div className={`grid ${statuses.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5
                                   sm:flex sm:gap-2 sm:flex-shrink-0 sm:ml-4`}>
                    {statuses.map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(m.email, s)}
                        className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg
                                    text-xs font-medium border transition-all
                                    ${status === s
                                      ? STATUS_STYLES[s]
                                      : 'border-white/5 text-portal-muted hover:border-white/20'
                                    }`}
                      >
                        <i className={`fa-solid ${STATUS_ICONS[s]}`} />
                        <span>{labels[s]}</span>
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
            ? <><InlineSpinner size="w-4 h-4" />Saving…</>
            : <><i className="fa-solid fa-floppy-disk" />Save Attendance</>
          }
        </button>
      </div>
    </div>
  );
}

export default AttendancePage;

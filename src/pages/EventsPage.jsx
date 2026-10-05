import { useState, useMemo, useCallback } from 'react';
import { useAuth }                       from '../context/AuthContext';
import { useAsync }                      from '../hooks/useAsync';
import { getEvents, getMemberAttendance } from '../services/eventService';
import Badge                              from '../components/Badge';
import LoadingSpinner                     from '../components/LoadingSpinner';
import { formatDateShort, safeHttpsUrl }  from '../utils/helpers';
import { EVENT_TYPES, eventTypeStyle }  from '../data/eventTypes';

const CATEGORIES = ['All', ...EVENT_TYPES];
const NO_DATA    = { events: [], attendance: [] };

function EventsPage() {
  const { memberData }       = useAuth();
  const [search,      setSearch]     = useState('');
  const [category,    setCategory]   = useState('All');
  const [dateFrom,    setDateFrom]   = useState('');

  const email = memberData?.email;
  const fetchEvents = useCallback(async () => {
    if (!email) return NO_DATA;
    const [events, attendance] = await Promise.all([getEvents(), getMemberAttendance(email)]);
    return { events, attendance };
  }, [email]);
  const { data: { events, attendance }, loading } = useAsync(fetchEvents, NO_DATA);

  const filtered = useMemo(() => {
    return events.filter(ev => {
      const titleMatch = (ev.title ?? '').toLowerCase().includes(search.toLowerCase());
      const catMatch   = category === 'All' || ev.category === category;

      let dateMatch = true;
      if (dateFrom) {
        const evDate = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date);
        // Local midnight, matching how event dates are stored. new Date('YYYY-MM-DD')
        // is UTC midnight, which in Sri Lanka (UTC+5:30) hid events on that day.
        if (evDate < new Date(dateFrom + 'T00:00:00')) dateMatch = false;
      }

      return titleMatch && catMatch && dateMatch;
    });
  }, [events, search, category, dateFrom]);

  if (loading) return <LoadingSpinner />;

  const getStatus = (eventId) =>
    attendance.find(a => a.eventId === eventId)?.status ?? 'not marked';

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-portal-text">Events</h1>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="card rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                         text-portal-muted/60 text-sm pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-portal-bg border border-white/5 rounded-lg pl-9 pr-4 py-2
                       text-portal-text placeholder-portal-muted/40 focus:outline-none
                       focus:border-portal-gold/50 transition-colors text-sm"
          />
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-portal-bg border border-white/5 rounded-lg px-3 py-2 text-portal-text
                     text-sm focus:outline-none focus:border-portal-gold/50 transition-colors"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-portal-bg border border-white/5 rounded-lg px-3 py-2 text-portal-muted
                     text-sm focus:outline-none focus:border-portal-gold/50 transition-colors"
        />

        {/* Reset */}
        {(search || category !== 'All' || dateFrom) && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); setDateFrom(''); }}
            className="text-portal-muted hover:text-portal-text text-sm px-3 py-2
                       border border-white/5 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-xmark mr-1" /> Clear
          </button>
        )}
      </div>

      {/* ── Event cards ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-portal-muted">
          <i className="fa-solid fa-calendar-xmark text-3xl mb-3 block opacity-40" />
          No events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <div
              key={ev.id}
              className="card rounded-xl p-5 flex flex-col gap-3
                         hover:bg-portal-hover transition-colors border border-subtle"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-portal-text font-semibold text-sm leading-tight flex-1">
                  {ev.title}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0
                                  ${eventTypeStyle(ev.category)}`}>
                  {ev.category}
                </span>
              </div>

              {/* Meta */}
              <div className="space-y-1 text-xs text-portal-muted">
                <p><i className="fa-solid fa-calendar w-4" /> {formatDateShort(ev.date)}</p>
                {ev.location && (
                  <p><i className="fa-solid fa-location-dot w-4" /> {ev.location}</p>
                )}
              </div>

              {ev.description && (
                <p className="text-portal-muted text-xs line-clamp-2 leading-relaxed">
                  {ev.description}
                </p>
              )}

              {/* Event photos */}
              {ev.photos?.length > 0 && (
                <div className="flex gap-1.5">
                  {ev.photos.map((p, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <a href={safeHttpsUrl(p.url)} target="_blank" rel="noopener noreferrer">
                        <img
                          src={safeHttpsUrl(p.url)}
                          alt={p.type}
                          className="w-16 h-16 rounded-lg object-cover border border-subtle
                                     hover:opacity-90 transition-opacity"
                        />
                      </a>
                      {p.type === 'signsheet' && (
                        <span className="absolute -top-1 -right-1 bg-portal-gold text-black
                                         text-[8px] font-bold rounded-full w-4 h-4
                                         flex items-center justify-center leading-none">S</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Member status */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-subtle">
                <span className="text-portal-muted text-xs">Your status:</span>
                <Badge status={getStatus(ev.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-portal-muted text-xs text-right">
        Showing {filtered.length} of {events.length} events
      </p>
    </div>
  );
}

export default EventsPage;

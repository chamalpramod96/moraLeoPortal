import { useState, useEffect } from 'react';
import { useAuth }                from '../context/AuthContext';
import LoadingSpinner             from '../components/LoadingSpinner';
import { EVENT_POINT_CATEGORIES } from '../data/pointsConfig';
import { calcEventPoints } from '../services/pointsService';
import { getMemberAttendance } from '../services/eventService';
import { getEvents }           from '../services/eventService';

// ─── Section accordion ────────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card border border-subtle">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-portal-gold">
          <i className={`fa-solid ${icon}`} />
          {title}
        </span>
        <i className={`fa-solid fa-chevron-down text-portal-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Points table for a category group ───────────────────────────────────────
function PointsGroup({ categories }) {
  const groups = categories.reduce((acc, c) => {
    (acc[c.group] = acc[c.group] ?? []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-portal-muted uppercase tracking-widest mb-2">{group}</p>
          <div className="rounded-lg overflow-hidden border border-subtle">
            <table className="w-full text-sm">
              <tbody>
                {items.map((cat, i) => (
                  <tr key={cat.id} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-4 py-2.5 text-portal-text">{cat.label}</td>
                    <td className="px-4 py-2.5 text-right">
                      {cat.points > 0
                        ? <span className="text-portal-gold font-bold">+{cat.points}</span>
                        : <span className="text-portal-muted text-xs italic">custom</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PointsTablePage() {
  const { memberData } = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [eventPts, setEventPts] = useState(0);

  useEffect(() => {
    if (!memberData?.email) { setLoading(false); return; }
    (async () => {
      try {
        const [att, events] = await Promise.all([
          getMemberAttendance(memberData.email),
          getEvents(),
        ]);
        const ep = calcEventPoints(memberData.email, att, events);
        setEventPts(ep);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberData?.email]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-portal-text">
          <i className="fa-solid fa-trophy text-portal-gold mr-2" />
          Mora Connect Points System
        </h1>
        <p className="text-portal-muted text-sm mt-1">
          Leo Club of Moratuwa — Membership Management & Development System
        </p>
      </div>

      {/* ── Personal progress card ── */}
      <div className="card-gold p-6">
        <p className="text-portal-muted text-xs uppercase tracking-widest mb-2">Your Points</p>
        <p className="text-4xl font-bold text-portal-text">
          {eventPts.toLocaleString()}
          <span className="text-portal-muted text-base font-normal ml-2">pts</span>
        </p>
      </div>

      {/* ── Participation (event-based) points ── */}
      <Section title="Participation Points — Events & Meetings" icon="fa-calendar-check">
        <p className="text-sm text-portal-muted mb-4">
          These points are automatically added when the Secretary marks your attendance as
          <span className="text-green-400 font-semibold"> Attended</span> for an event.
        </p>
        <PointsGroup categories={EVENT_POINT_CATEGORIES} />
      </Section>

    </div>
  );
}

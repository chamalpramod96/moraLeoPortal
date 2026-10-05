import { useState, useEffect } from 'react';
import { useAuth }                from '../context/AuthContext';
import LoadingSpinner             from '../components/LoadingSpinner';
import { ACTIVE_EVENT_POINT_CATEGORIES, MANUAL_POINT_CATEGORIES, LEVELS, getLevelInfo } from '../data/pointsConfig';
import { computeMemberPoints, getMemberManualPoints } from '../services/pointsService';
import { getMemberAttendance, getEvents }              from '../services/eventService';
import { getProjects }                               from '../services/projectService';
import { memberKey }                                 from '../utils/helpers';

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
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {cat.hybrid ? (
                        <span className="text-xs">
                          <span className="text-portal-gold font-bold">+{cat.points}</span>
                          <span className="text-portal-muted"> physical · </span>
                          <span className="text-portal-gold font-bold">+{cat.onlinePoints}</span>
                          <span className="text-portal-muted"> online</span>
                        </span>
                      ) : cat.points > 0
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

// ─── Level ladder ──────────────────────────────────────────────────────────────
function LevelLadder({ currentLevel }) {
  return (
    <div className="space-y-2">
      {LEVELS.map(lvl => (
        <div
          key={lvl.level}
          className={`flex items-center justify-between px-3 py-2 rounded-lg border ${lvl.border} ${lvl.bg}
                      ${lvl.level === currentLevel ? 'ring-1 ring-portal-gold' : ''}`}
        >
          <div>
            <span className={`font-semibold text-sm ${lvl.color}`}>{lvl.label}</span>
            {lvl.unlock && <span className="text-portal-muted text-xs ml-2">— {lvl.unlock}</span>}
          </div>
          <span className="text-portal-muted text-xs font-mono">{lvl.minPoints.toLocaleString()}+ pts</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PointsTablePage() {
  const { memberData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [totals,  setTotals]  = useState({ eventPoints: 0, projectPoints: 0, manualPoints: 0, total: 0 });

  const email = memberData?.email;
  useEffect(() => {
    if (!email) { setLoading(false); return; }
    (async () => {
      try {
        const [att, events, manualPts, projects, key] = await Promise.all([
          getMemberAttendance(email),
          getEvents(),
          getMemberManualPoints(email),
          getProjects(),
          memberKey(email),
        ]);
        setTotals(computeMemberPoints(email, att, events, manualPts, projects, key));
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  if (loading) return <LoadingSpinner />;

  const { eventPoints, projectPoints, manualPoints, total } = totals;
  const { current, next, progressPct } = getLevelInfo(total);

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
      <div className="card-gold p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-portal-muted text-xs uppercase tracking-widest mb-2">Your Total Points</p>
            <p className="text-4xl font-bold text-portal-text">
              {total.toLocaleString()}
              <span className="text-portal-muted text-base font-normal ml-2">pts</span>
            </p>
            <div className="flex gap-4 mt-2 text-xs text-portal-muted">
              <span>Events: <strong className="text-portal-text">{eventPoints.toLocaleString()}</strong></span>
              <span>Projects: <strong className="text-portal-text">{projectPoints.toLocaleString()}</strong></span>
              {manualPoints > 0 && (
                <span>Awards: <strong className="text-portal-text">{manualPoints.toLocaleString()}</strong></span>
              )}
            </div>
          </div>

          <div className={`px-4 py-2 rounded-lg border ${current.border} ${current.bg} text-center sm:text-right flex-shrink-0`}>
            <p className={`text-sm font-bold ${current.color}`}>{current.label}</p>
            {current.unlock && <p className="text-portal-muted text-[11px] mt-0.5">{current.unlock}</p>}
          </div>
        </div>

        {/* Progress bar to next level */}
        {next ? (
          <div>
            <div className="flex justify-between text-xs text-portal-muted mb-1">
              <span>{current.label}</span>
              <span>{(next.minPoints - total).toLocaleString()} pts to {next.label}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-portal-gold transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-portal-gold font-semibold">
            <i className="fa-solid fa-crown mr-1" /> Maximum level reached — Leo Legend!
          </p>
        )}
      </div>

      {/* ── Level progression ── */}
      <Section title="Level Progression" icon="fa-layer-group">
        <p className="text-sm text-portal-muted mb-4">
          Your level is based on <strong>total points</strong> (participation + manual/achievement points combined).
        </p>
        <LevelLadder currentLevel={current.level} />
      </Section>

      {/* ── Participation (event-based) points ── */}
      <Section title="Participation Points — Events & Meetings" icon="fa-calendar-check">
        <p className="text-sm text-portal-muted mb-4">
          These points are automatically added when the Secretary marks your attendance as
          <span className="text-green-400 font-semibold"> Attended</span> for an event.
        </p>
        <PointsGroup categories={ACTIVE_EVENT_POINT_CATEGORIES} />
      </Section>

      {/* ── Manual / involvement points ── */}
      <Section title="Involvement, Achievement & Growth Points" icon="fa-award">
        <p className="text-sm text-portal-muted mb-4">
          These points are awarded manually by the Secretary for roles, involvements, achievements,
          membership growth, and newsletter contributions — they don't come from event attendance.
        </p>
        <PointsGroup categories={MANUAL_POINT_CATEGORIES} />
      </Section>

    </div>
  );
}

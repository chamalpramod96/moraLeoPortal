import { useState, useEffect } from 'react';
import { useAuth }                from '../context/AuthContext';
import LoadingSpinner             from '../components/LoadingSpinner';
import {
  LEVELS, getLevelInfo,
  EVENT_POINT_CATEGORIES, MANUAL_POINT_CATEGORIES,
  EVALUATION_CRITERIA, EVALUATION_RATINGS,
  groupedEventCategories, groupedManualCategories,
} from '../data/pointsConfig';
import { getMemberManualPoints, calcEventPoints, calcManualPoints } from '../services/pointsService';
import { getMemberAttendance } from '../services/eventService';
import { getEvents }           from '../services/eventService';

// ─── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level, size = 'md' }) {
  const cls = size === 'lg'
    ? 'text-lg px-4 py-1.5 font-bold'
    : 'text-xs px-2.5 py-1 font-semibold';
  return (
    <span className={`inline-flex items-center rounded-full border ${level.border ?? level.borderClass ?? 'border-gray-600'}
                      ${level.bg ?? level.bgClass} ${level.color ?? level.colorClass} ${cls}`}>
      <i className="fa-solid fa-star mr-1.5 opacity-70" />{level.label}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, colorClass }) {
  return (
    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClass.replace('text-', 'bg-')}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

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

  const [loading,      setLoading]      = useState(true);
  const [eventPts,     setEventPts]     = useState(0);
  const [manualPts,    setManualPts]    = useState(0);
  const [total,        setTotal]        = useState(0);

  useEffect(() => {
    if (!memberData?.email) { setLoading(false); return; }
    (async () => {
      try {
        const [att, events, manual] = await Promise.all([
          getMemberAttendance(memberData.email),
          getEvents(),
          getMemberManualPoints(memberData.email),
        ]);
        const ep = calcEventPoints(memberData.email, att, events);
        const mp = calcManualPoints(memberData.email, manual);
        setEventPts(ep);
        setManualPts(mp);
        setTotal(ep + mp);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberData?.email]);

  if (loading) return <LoadingSpinner fullScreen />;

  const { current, next, progressPct } = getLevelInfo(total);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-portal-text">
          <i className="fa-solid fa-trophy text-portal-gold mr-2" />
          Mora Miglioria Points System
        </h1>
        <p className="text-portal-muted text-sm mt-1">
          Leo Club of Moratuwa — Membership Management & Development System
        </p>
      </div>

      {/* ── Personal progress card ── */}
      <div className="card-gold p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-portal-muted text-xs uppercase tracking-widest mb-1">Your Progress</p>
            <div className="flex items-center gap-3">
              <LevelBadge level={current} size="lg" />
              {current.unlock && (
                <span className="text-xs text-portal-muted italic">
                  <i className="fa-solid fa-lock-open mr-1" />{current.unlock}
                </span>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold text-portal-text">
              {total.toLocaleString()}
              <span className="text-portal-muted text-base font-normal ml-1">pts</span>
            </p>
            <p className="text-xs text-portal-muted mt-0.5">
              Event attendance: <span className="text-portal-text">{eventPts.toLocaleString()}</span>
              &nbsp;·&nbsp;Manual / other: <span className="text-portal-text">{manualPts.toLocaleString()}</span>
            </p>
          </div>

          {next && (
            <div className="sm:min-w-[200px]">
              <p className="text-xs text-portal-muted mb-1">
                Progress to <span className={next.color ?? next.colorClass}>{next.label}</span>
              </p>
              <ProgressBar pct={progressPct} colorClass={current.color ?? current.colorClass} />
              <p className="text-xs text-portal-muted mt-1 text-right">
                {(next.minPoints - total).toLocaleString()} pts needed
              </p>
            </div>
          )}
          {!next && (
            <div className="text-center">
              <i className="fa-solid fa-crown text-portal-gold text-4xl" />
              <p className="text-xs text-portal-gold mt-1">Maximum Level!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Path of Progress ── */}
      <Section title="Path of Progress — All Levels" icon="fa-map" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {LEVELS.map(lvl => {
            const isCurrentLvl = lvl.level === current.level;
            return (
              <div
                key={lvl.level}
                className={`rounded-lg border p-3 transition-all
                  ${isCurrentLvl
                    ? `${lvl.bg ?? lvl.bgClass} ${lvl.border ?? lvl.borderClass ?? ''} ring-1 ring-portal-gold/40`
                    : 'border-subtle bg-white/[0.02]'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${isCurrentLvl ? (lvl.color ?? lvl.colorClass) : 'text-portal-muted'}`}>
                    {lvl.label}
                    {isCurrentLvl && <i className="fa-solid fa-location-dot ml-1.5 text-xs" />}
                  </span>
                  <span className="text-xs text-portal-muted">{lvl.minPoints.toLocaleString()} pts</span>
                </div>
                {lvl.unlock && (
                  <p className="text-[11px] text-portal-muted">
                    <i className="fa-solid fa-unlock mr-1" />{lvl.unlock}
                  </p>
                )}
                {lvl.level === 0 && (
                  <p className="text-[11px] text-portal-muted">Starting point for all new Leos</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-portal-muted mt-3 italic">
          * Levels unlock eligibility for club positions. Prerequisites (membership duration, YEA rating) also apply.
        </p>
      </Section>

      {/* ── Participation (event-based) points ── */}
      <Section title="Participation Points — Events & Meetings" icon="fa-calendar-check">
        <p className="text-sm text-portal-muted mb-4">
          These points are automatically added when the Secretary marks your attendance as
          <span className="text-green-400 font-semibold"> Attended</span> for an event.
        </p>
        <PointsGroup categories={EVENT_POINT_CATEGORIES} />
      </Section>

      {/* ── Manual points (involvements, achievements, growth) ── */}
      <Section title="Involvements, Achievements & Growth Points" icon="fa-medal">
        <p className="text-sm text-portal-muted mb-4">
          These points are added manually by an Admin (Secretary / President) for roles held, awards received, or members you recruited.
        </p>
        <PointsGroup categories={MANUAL_POINT_CATEGORIES.filter(c => c.id !== 'manual')} />
      </Section>

      {/* ── Yearly Evaluation ── */}
      <Section title="Yearly Evaluation Rating (YEA) — Reference" icon="fa-chart-bar">
        <p className="text-sm text-portal-muted mb-4">
          Members are evaluated annually on 10 criteria, each scored 1–100. The average rating determines YEA level,
          which is a prerequisite for reaching higher levels.
        </p>

        {/* Criteria list */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          {EVALUATION_CRITERIA.map(c => (
            <div key={c} className="text-center text-xs bg-white/[0.03] border border-subtle rounded-lg px-2 py-2 text-portal-text">
              {c}
            </div>
          ))}
        </div>

        {/* Rating bands */}
        <div className="rounded-lg overflow-hidden border border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wider">Score Range</th>
                <th className="px-4 py-2.5 text-left text-portal-muted text-xs uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody>
              {[...EVALUATION_RATINGS].reverse().map((r, i) => (
                <tr key={r.range} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                  <td className="px-4 py-2.5 text-portal-muted font-mono">{r.range}</td>
                  <td className={`px-4 py-2.5 font-semibold ${r.color}`}>{r.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

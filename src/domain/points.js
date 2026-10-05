import { isAttended, isHybridEvent, getEventCategory, PROJECT_ROLES } from '../data/pointsConfig';

/**
 * Mora Connect points maths — pure functions, no Firebase. Every screen
 * (Dashboard, Profile, Points Table, Leaderboard) uses these, so totals
 * always agree. Covered by points.test.js.
 */

/**
 * Points one attendance record earns. Joining a hybrid meeting online earns
 * the event's online points (stored on the event, falling back to the
 * category's); if the event is no longer hybrid, online counts as attended.
 */
export function eventPointsFor(status, ev) {
  if (!ev || !isAttended(status)) return 0;
  if (status === 'attended_online' && isHybridEvent(ev)) {
    return Number(ev.onlinePointsValue ?? getEventCategory(ev.pointsCategory)?.onlinePoints ?? 0);
  }
  return Number(ev.pointsValue ?? 0);
}

/**
 * Total event-attendance points for one member.
 * attendance: attendance records (any members — filtered here)
 * events:     all events (must include pointsValue field)
 */
export function calcEventPoints(memberEmail, attendance, events) {
  const memberId = memberEmail.toLowerCase();
  const eventsById = new Map(events.map(e => [e.id, e]));
  return attendance
    .filter(a => a.memberId === memberId && isAttended(a.status))
    .reduce((sum, a) => sum + eventPointsFor(a.status, eventsById.get(a.eventId)), 0);
}

/** Total manual points ("awards") for one member. */
export function calcManualPoints(memberEmail, manualPoints) {
  const memberId = memberEmail.toLowerCase();
  return manualPoints
    .filter(p => p.memberId === memberId)
    .reduce((sum, p) => sum + (Number(p.points) || 0), 0);
}

/**
 * Project roles a member holds (matched by memberKey), in project order:
 * [{ projectId, projectName, date, role, roleLabel, points }]
 */
export function projectRolesFor(key, projects = []) {
  if (!key) return [];
  const out = [];
  for (const p of projects) {
    for (const r of PROJECT_ROLES) {
      if (p.roles?.[r.id]?.key === key) {
        out.push({
          projectId: p.id, projectName: p.name, date: p.date,
          role: r.id, roleLabel: r.label,
          points: Number(p.rolePoints?.[r.id] ?? r.points),
        });
      }
    }
  }
  return out;
}

/**
 * Full breakdown for one member.
 * Returns { eventPoints, projectPoints, manualPoints, total }.
 * `key` (memberKey of the email) is needed for project points; without it
 * they count as 0.
 */
export function computeMemberPoints(memberEmail, attendance, events, manualPoints, projects = [], key = null) {
  const eventPts   = calcEventPoints(memberEmail, attendance, events);
  const projectPts = projectRolesFor(key, projects).reduce((s, r) => s + r.points, 0);
  const manualPts  = calcManualPoints(memberEmail, manualPoints);
  return {
    eventPoints: eventPts, projectPoints: projectPts, manualPoints: manualPts,
    total: eventPts + projectPts + manualPts,
  };
}

/**
 * Sort leaderboard rows by total (then name) and number them; equal totals
 * share a place (1, 2, 2, 4). Sorts in place and returns the array.
 */
export function rankRows(rows) {
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  rows.forEach((r, i) => {
    r.rank = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

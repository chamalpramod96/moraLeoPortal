import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MOCK_MEMBER_POINTS } from '../data/mockData';
import { isAttended, isHybridEvent, getEventCategory, PROJECT_ROLES } from '../data/pointsConfig';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// ─── Manual points CRUD ────────────────────────────────────────────────────────

export async function getMemberManualPoints(memberEmail) {
  if (IS_DEMO) return MOCK_MEMBER_POINTS.filter(p => p.memberId === memberEmail.toLowerCase());
  const q    = query(collection(db, 'memberPoints'), where('memberId', '==', memberEmail.toLowerCase()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllManualPoints() {
  if (IS_DEMO) return MOCK_MEMBER_POINTS;
  const snap = await getDocs(collection(db, 'memberPoints'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addManualPoints({ memberId, points, categoryId, description, addedBy }) {
  if (IS_DEMO) { console.info('[DEMO] addManualPoints – not persisted.'); return { id: 'demo-mp-' + Date.now() }; }
  return await addDoc(collection(db, 'memberPoints'), {
    memberId:   memberId.toLowerCase(),
    points:     Number(points),
    categoryId,
    description,
    addedBy,
    addedAt:    serverTimestamp(),
  });
}

export async function deleteManualPoints(pointId) {
  if (IS_DEMO) { console.info('[DEMO] deleteManualPoints – not persisted.'); return; }
  await deleteDoc(doc(db, 'memberPoints', pointId));
}

// ─── Computation helpers (pure, no Firebase calls) ───────────────────────────

/**
 * Compute total event-attendance points for one member.
 * attendance: all attendance records
 * events:     all events (must include pointsValue field)
 */
export function calcEventPoints(memberEmail, attendance, events) {
  return attendance
    .filter(a => a.memberId === memberEmail.toLowerCase() && isAttended(a.status))
    .reduce((sum, a) => sum + eventPointsFor(a.status, events.find(e => e.id === a.eventId)), 0);
}

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
 * Compute total manual points for one member.
 */
export function calcManualPoints(memberEmail, manualPoints) {
  return manualPoints
    .filter(p => p.memberId === memberEmail.toLowerCase())
    .reduce((sum, p) => sum + (Number(p.points) || 0), 0);
}

/**
 * Project roles a member holds (matched by memberKey), newest first:
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

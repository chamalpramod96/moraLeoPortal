import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getMembers } from './memberService';
import { getEvents, getAllAttendance } from './eventService';
import { getAllManualPoints } from './pointsService';
import { getProjects } from './projectService';
import { computeMemberPoints, rankRows } from '../domain/points';
import { memberKey } from '../utils/helpers';
import { IS_DEMO } from '../config/env';

/**
 * The leaderboard every member can see is a published summary in
 * leaderboard/current: name, position and points only. Members can't read
 * other members' records or attendance (rules), so admins — who can —
 * compute it and publish it after any change that affects points.
 * Rows are keyed by memberKey(email) so no email is exposed.
 */
const leaderboardDoc = () => doc(db, 'leaderboard', 'current');

/** Admin only: build the ranking from full data (active members). */
export async function computeLeaderboard() {
  const [members, events, manualPts, attendance, projects] = await Promise.all([
    getMembers(), getEvents(), getAllManualPoints(), getAllAttendance(), getProjects(),
  ]);
  const rows = await Promise.all(
    members.filter(m => m.isActive).map(async m => {
      const key = await memberKey(m.email);
      const { eventPoints, projectPoints, manualPoints, total } =
        computeMemberPoints(m.email, attendance, events, manualPts, projects, key);
      return {
        key,
        name:     m.fullName ?? '',
        position: m.position ?? '',
        eventPoints, projectPoints, manualPoints, total,
      };
    }),
  );
  return rankRows(rows);
}

/** Admin only: save computed rows as the members-visible leaderboard. */
export async function saveLeaderboard(rows) {
  if (IS_DEMO) return;
  await setDoc(leaderboardDoc(), { rows, updatedAt: serverTimestamp() });
}

let refreshTimer;
/**
 * Call after an admin change that can affect points or names (attendance,
 * manual points, events, members, projects). Debounced so a burst of changes
 * is recomputed once; runs in the background and never throws.
 */
export function refreshLeaderboardSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      await saveLeaderboard(await computeLeaderboard());
    } catch (err) {
      console.warn('[leaderboard] refresh failed:', err?.code ?? err);
    }
  }, 800);
}

/** Any active member: the published leaderboard, or null if none yet. */
export async function getPublishedLeaderboard() {
  if (IS_DEMO) return null;
  const snap = await getDoc(leaderboardDoc());
  return snap.exists() ? snap.data() : null;
}

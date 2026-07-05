import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MOCK_MEMBER_POINTS } from '../data/mockData';

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
    .filter(a => a.memberId === memberEmail.toLowerCase() && a.status === 'attended')
    .reduce((sum, a) => {
      const ev = events.find(e => e.id === a.eventId);
      return sum + (ev?.pointsValue ?? 0);
    }, 0);
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
 * Full breakdown for one member.
 * Returns { eventPoints, manualPoints, total }
 */
export function computeMemberPoints(memberEmail, attendance, events, manualPoints) {
  const eventPts  = calcEventPoints(memberEmail, attendance, events);
  const manualPts = calcManualPoints(memberEmail, manualPoints);
  return { eventPoints: eventPts, manualPoints: manualPts, total: eventPts + manualPts };
}

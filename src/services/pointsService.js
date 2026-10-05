import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { docsWithIds, logDemoWrite } from './firestoreUtils';
import { MOCK_MEMBER_POINTS } from '../data/mockData';
import { IS_DEMO } from '../config/env';

/**
 * Manual points ("awards"): memberPoints/{id} =
 *   { memberId, points, categoryId, description, addedBy, addedAt }.
 * The points maths lives in src/domain/points.js.
 */

export async function getMemberManualPoints(memberEmail) {
  const memberId = memberEmail.toLowerCase();
  if (IS_DEMO) return MOCK_MEMBER_POINTS.filter(p => p.memberId === memberId);
  return docsWithIds(await getDocs(query(collection(db, 'memberPoints'), where('memberId', '==', memberId))));
}

export async function getAllManualPoints() {
  if (IS_DEMO) return MOCK_MEMBER_POINTS;
  return docsWithIds(await getDocs(collection(db, 'memberPoints')));
}

export async function addManualPoints({ memberId, points, categoryId, description, addedBy }) {
  if (IS_DEMO) { logDemoWrite('addManualPoints'); return { id: 'demo-mp-' + Date.now() }; }
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
  if (IS_DEMO) { logDemoWrite('deleteManualPoints'); return; }
  await deleteDoc(doc(db, 'memberPoints', pointId));
}

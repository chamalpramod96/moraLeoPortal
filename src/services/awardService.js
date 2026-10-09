import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logDemoWrite } from './firestoreUtils';
import { normalizeEntry } from '../domain/awards';
import { MOCK_AWARD_NOMINATIONS } from '../data/mockData';
import { IS_DEMO } from '../config/env';

/**
 * Project award nominations — admins only (firestore.rules).
 * awardNominations/{categoryId}: { nominations: [3 × string], comment,
 *                                  updatedBy, updatedAt }
 * Category ids and names are fixed in src/data/awardCategories.js.
 */

/** All saved entries as { [categoryId]: { nominations, comment } }. */
export async function getAwardNominations() {
  const docs = IS_DEMO
    ? MOCK_AWARD_NOMINATIONS
    : (await getDocs(collection(db, 'awardNominations'))).docs.map(d => ({ id: d.id, ...d.data() }));
  return Object.fromEntries(docs.map(d => [d.id, normalizeEntry(d)]));
}

/** Saves one category's nominations and comment. */
export async function saveAwardNomination(categoryId, entry, updatedBy) {
  if (IS_DEMO) { logDemoWrite('saveAwardNomination'); return; }
  const { nominations, comment } = normalizeEntry(entry);
  await setDoc(doc(db, 'awardNominations', categoryId), {
    nominations, comment, updatedBy, updatedAt: serverTimestamp(),
  });
}

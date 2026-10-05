import { writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/** A document snapshot as a plain object, with its id. */
export const withId = (snap) => ({ id: snap.id, ...snap.data() });

/** Every document of a query snapshot, as plain objects with ids. */
export const docsWithIds = (snap) => snap.docs.map(withId);

/**
 * A date-input value ('YYYY-MM-DD') as a Timestamp at local midnight.
 * new Date('YYYY-MM-DD') alone is UTC midnight, which is the previous day
 * for part of it in Sri Lanka (UTC+5:30).
 */
export const dateInputToTimestamp = (value) => Timestamp.fromDate(new Date(value + 'T00:00:00'));

// A batch holds at most 500 writes; stay well under it.
const BATCH_SIZE = 450;

/**
 * Delete documents in as few batches as possible. Each batch is atomic; pass
 * the refs in the order they should go (e.g. a parent last, so a failure
 * part-way leaves it in place and the delete can simply be run again).
 */
export async function deleteInBatches(refs) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_SIZE).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

/** Demo mode: log a write that is skipped. */
export const logDemoWrite = (name) => console.info(`[DEMO] ${name} — not persisted.`);

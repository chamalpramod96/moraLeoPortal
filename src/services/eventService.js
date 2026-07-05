import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../data/mockData';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// ─── Events ────────────────────────────────────────────────────────────────

export async function getEvents() {
  if (IS_DEMO) return [...MOCK_EVENTS].sort((a, b) => b.date.toDate() - a.date.toDate());
  const q    = query(collection(db, 'events'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEvent(eventId) {
  if (IS_DEMO) return MOCK_EVENTS.find(e => e.id === eventId) ?? null;
  const snap = await getDoc(doc(db, 'events', eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addEvent(eventData, createdBy) {
  if (IS_DEMO) { console.info('[DEMO] addEvent — not persisted.'); return { id: 'demo-new' }; }
  const dateTs = eventData.date
    ? Timestamp.fromDate(new Date(eventData.date + 'T00:00:00'))
    : serverTimestamp();

  return await addDoc(collection(db, 'events'), {
    title:          eventData.title          ?? '',
    description:    eventData.description    ?? '',
    date:           dateTs,
    location:       eventData.location       ?? '',
    category:       eventData.category       ?? 'Service',
    pointsCategory: eventData.pointsCategory ?? '',
    pointsValue:    Number(eventData.pointsValue ?? 0),
    photos:         eventData.photos         ?? [],
    createdBy,
    createdAt:      serverTimestamp(),
  });
}

export async function updateEvent(eventId, updates) {
  if (IS_DEMO) { console.info('[DEMO] updateEvent — not persisted.'); return; }
  const payload = { ...updates };
  if (updates.date && typeof updates.date === 'string') {
    payload.date = Timestamp.fromDate(new Date(updates.date + 'T00:00:00'));
  }  if (updates.pointsValue !== undefined) payload.pointsValue = Number(updates.pointsValue);  await updateDoc(doc(db, 'events', eventId), payload);
}

export async function deleteEvent(eventId) {
  if (IS_DEMO) { console.info('[DEMO] deleteEvent — not persisted.'); return; }
  // Cascade: delete all attendance records for this event first
  const attSnap = await getDocs(
    query(collection(db, 'attendance'), where('eventId', '==', eventId))
  );
  const batch = writeBatch(db);
  attSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'events', eventId));
  await batch.commit();
}

// ─── Attendance ────────────────────────────────────────────────────────────

export async function getAttendanceForEvent(eventId) {
  if (IS_DEMO) return MOCK_ATTENDANCE.filter(a => a.eventId === eventId);
  const q    = query(collection(db, 'attendance'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMemberAttendance(memberEmail) {
  if (IS_DEMO) return MOCK_ATTENDANCE.filter(a => a.memberId === memberEmail.toLowerCase());
  const q    = query(collection(db, 'attendance'), where('memberId', '==', memberEmail.toLowerCase()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Replace all attendance records for an event.
 * records: [{ memberId: string, status: 'attended'|'absent'|'excused' }]
 */
export async function saveEventAttendance(eventId, records, markedBy) {
  if (IS_DEMO) { console.info('[DEMO] saveEventAttendance — not persisted.'); return; }
  // Delete existing records
  const existing = await getAttendanceForEvent(eventId);
  await Promise.all(existing.map(a => deleteDoc(doc(db, 'attendance', a.id))));

  // Write new records
  await Promise.all(
    records.map(r =>
      addDoc(collection(db, 'attendance'), {
        eventId,
        memberId: r.memberId,
        status:   r.status,
        markedBy,
        markedAt: serverTimestamp(),
      }),
    ),
  );
}

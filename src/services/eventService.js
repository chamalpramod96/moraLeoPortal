import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, writeBatch,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadEventPhoto, deleteEventPhoto } from './storageService';
import { docsWithIds, withId, dateInputToTimestamp, deleteInBatches, logDemoWrite } from './firestoreUtils';
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../data/mockData';
import { IS_DEMO } from '../config/env';

/**
 * Events (events/{id}) and attendance (attendance/{id}, one record per
 * member per event: { eventId, memberId, status, markedBy, markedAt }).
 */

// ─── Events ────────────────────────────────────────────────────────────────

export async function getEvents() {
  if (IS_DEMO) return [...MOCK_EVENTS].sort((a, b) => b.date.toDate() - a.date.toDate());
  return docsWithIds(await getDocs(query(collection(db, 'events'), orderBy('date', 'desc'))));
}

export async function getEvent(eventId) {
  if (IS_DEMO) return MOCK_EVENTS.find(e => e.id === eventId) ?? null;
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? withId(snap) : null;
}

export async function addEvent(eventData, createdBy) {
  if (IS_DEMO) { logDemoWrite('addEvent'); return { id: 'demo-new' }; }
  return await addDoc(collection(db, 'events'), {
    title:          eventData.title          ?? '',
    description:    eventData.description    ?? '',
    date:           eventData.date ? dateInputToTimestamp(eventData.date) : serverTimestamp(),
    location:       eventData.location       ?? '',
    category:       eventData.category       ?? 'Service',
    pointsCategory: eventData.pointsCategory ?? '',
    pointsValue:    Number(eventData.pointsValue ?? 0),
    // Online points for hybrid meetings (0 for other categories)
    onlinePointsValue: Number(eventData.onlinePointsValue ?? 0),
    photos:         eventData.photos         ?? [],
    createdBy,
    createdAt:      serverTimestamp(),
  });
}

export async function updateEvent(eventId, updates) {
  if (IS_DEMO) { logDemoWrite('updateEvent'); return; }
  // `id` is the document key the UI carries around, not a field to store
  const { id: _id, ...payload } = updates;
  if (typeof updates.date === 'string' && updates.date) payload.date = dateInputToTimestamp(updates.date);
  if (updates.pointsValue !== undefined) payload.pointsValue = Number(updates.pointsValue);
  if (updates.onlinePointsValue !== undefined) payload.onlinePointsValue = Number(updates.onlinePointsValue);
  await updateDoc(doc(db, 'events', eventId), payload);
}

export async function deleteEvent(eventId) {
  if (IS_DEMO) { logDemoWrite('deleteEvent'); return; }
  // Grab photo URLs first so we can clean up Storage after the Firestore delete
  const eventSnap = await getDoc(doc(db, 'events', eventId));
  const photos    = eventSnap.exists() ? (eventSnap.data().photos ?? []) : [];

  // Cascade: the event's attendance records, then the event itself (one
  // atomic batch for any normal event; the event goes last either way).
  const attSnap = await getDocs(query(collection(db, 'attendance'), where('eventId', '==', eventId)));
  await deleteInBatches([...attSnap.docs.map(d => d.ref), doc(db, 'events', eventId)]);

  // Best-effort Storage cleanup — a failed delete here shouldn't block the
  // event from being removed (the Firestore state is already authoritative).
  await Promise.all(photos.map(p => deleteEventPhoto(p?.url)));
}

// ─── Event photos (event form) ─────────────────────────────────────────────
// The form keeps photos already saved ({ url, type, caption }) apart from
// newly picked files ({ file, preview, type, caption }).

/** Uploads the new files and returns the full photos array to store. */
async function resolveEventPhotos(eventId, existingPhotos = [], newPhotoFiles = []) {
  // Only the fields Firestore should hold
  const kept = existingPhotos.map(p => ({ url: p.url, type: p.type, caption: p.caption || '' }));
  const uploaded = await Promise.all(newPhotoFiles.map(async (p) => ({
    url:     await uploadEventPhoto(eventId, p.file),
    type:    p.type,
    caption: p.caption || '',
  })));
  return [...kept, ...uploaded];
}

/**
 * Creates an event from the event form, then uploads its photos (the event id
 * is needed for their storage path). Throws if the event couldn't be created;
 * once it exists, returns { photosSaved } instead, so a photo failure isn't
 * mistaken for a failed create (and the form isn't submitted twice).
 */
export async function createEventFromForm(formData, createdBy) {
  const { existingPhotos, newPhotoFiles, ...fields } = formData;
  const { id } = await addEvent({ ...fields, photos: [] }, createdBy);
  try {
    const photos = await resolveEventPhotos(id, existingPhotos, newPhotoFiles);
    if (photos.length > 0) await updateEvent(id, { photos });
    return { photosSaved: true };
  } catch {
    return { photosSaved: false };
  }
}

/**
 * Saves the event form for an existing event. Photos the admin removed are
 * deleted from Storage only after the event stops referencing them —
 * deleting first left broken images if the save failed.
 */
export async function updateEventFromForm(eventId, formData, originalPhotos = []) {
  const { existingPhotos = [], newPhotoFiles, ...fields } = formData;
  const keptUrls = new Set(existingPhotos.map(p => p.url));
  const removed  = originalPhotos.filter(p => !keptUrls.has(p.url));

  const photos = await resolveEventPhotos(eventId, existingPhotos, newPhotoFiles);
  await updateEvent(eventId, { ...fields, photos });
  await Promise.all(removed.map(p => deleteEventPhoto(p.url)));
}

// ─── Attendance ────────────────────────────────────────────────────────────

export async function getAttendanceForEvent(eventId) {
  if (IS_DEMO) return MOCK_ATTENDANCE.filter(a => a.eventId === eventId);
  return docsWithIds(await getDocs(query(collection(db, 'attendance'), where('eventId', '==', eventId))));
}

export async function getMemberAttendance(memberEmail) {
  const memberId = memberEmail.toLowerCase();
  if (IS_DEMO) return MOCK_ATTENDANCE.filter(a => a.memberId === memberId);
  return docsWithIds(await getDocs(query(collection(db, 'attendance'), where('memberId', '==', memberId))));
}

/** All attendance records (admin only — rules deny this query to members). */
export async function getAllAttendance() {
  if (IS_DEMO) return MOCK_ATTENDANCE;
  return docsWithIds(await getDocs(collection(db, 'attendance')));
}

/**
 * Replace the attendance records of the given members for an event.
 * Records of members not in `records` (e.g. deactivated members, who aren't
 * shown on the attendance page) are left untouched, so their history and
 * points survive a re-save.
 * records: [{ memberId: string, status: 'attended'|'attended_online'|'absent'|'excused' }]
 */
export async function saveEventAttendance(eventId, records, markedBy) {
  if (IS_DEMO) { logDemoWrite('saveEventAttendance'); return; }
  const existing = await getAttendanceForEvent(eventId);
  const savedIds = new Set(records.map(r => r.memberId));

  // Single atomic batch: either every delete + write succeeds, or none do.
  // (Fits the 500-write limit for up to ~250 active members.)
  const batch = writeBatch(db);
  existing
    .filter(a => savedIds.has(a.memberId))
    .forEach(a => batch.delete(doc(db, 'attendance', a.id)));
  records.forEach(r => {
    batch.set(doc(collection(db, 'attendance')), {
      eventId,
      memberId: r.memberId,
      status:   r.status,
      markedBy,
      markedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

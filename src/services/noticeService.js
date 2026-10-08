import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { docsWithIds, dateInputToTimestamp, logDemoWrite } from './firestoreUtils';
import { MOCK_NOTICES } from '../data/mockData';
import { IS_DEMO } from '../config/env';

/**
 * Notice Board, readable by every active member; admins post, edit and
 * delete (firestore.rules / storage.rules).
 *
 * notices/{id}: { title, date, time ('HH:MM' or ''), place, description,
 *                 link (https or ''), imageUrl, imagePath,
 *                 createdBy, createdAt, updatedAt }
 */

export async function getNotices() {
  if (IS_DEMO) return MOCK_NOTICES;
  return docsWithIds(await getDocs(query(collection(db, 'notices'), orderBy('date', 'desc'))));
}

/**
 * Create (no `id`) or update a notice. `imageFile` replaces the invitation
 * card when given; `removeImage` clears it. Returns the notice id.
 */
export async function saveNotice({
  id, title, date, time, place, description, link, imageFile, removeImage, existing, postedBy,
}) {
  if (IS_DEMO) { logDemoWrite('saveNotice'); return id ?? 'demo'; }
  const docRef = id ? doc(db, 'notices', id) : doc(collection(db, 'notices'));

  let imageUrl  = existing?.imageUrl  ?? '';
  let imagePath = existing?.imagePath ?? '';
  const oldPath = imagePath;

  if (imageFile) {
    const safeName = imageFile.name.replace(/[^\w.-]+/g, '_');
    imagePath = `notices/${docRef.id}/${Date.now()}_${safeName}`;
    const fileRef = ref(storage, imagePath);
    await uploadBytes(fileRef, imageFile, { contentType: imageFile.type });
    imageUrl = await getDownloadURL(fileRef);
  } else if (removeImage) {
    imageUrl = '';
    imagePath = '';
  }

  await setDoc(docRef, {
    title:       title.trim(),
    date:        dateInputToTimestamp(date),
    time:        time ?? '',
    place:       (place ?? '').trim(),
    description: (description ?? '').trim(),
    link:        (link ?? '').trim(),
    imageUrl,
    imagePath,
    createdBy:   existing?.createdBy ?? postedBy,
    createdAt:   existing?.createdAt ?? serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });

  // Only after the record points at the new card, remove the old file
  if (oldPath && oldPath !== imagePath) {
    await deleteObject(ref(storage, oldPath)).catch(() => {});
  }
  return docRef.id;
}

/** Remove the record first (members stop seeing it), then its card image. */
export async function deleteNotice(notice) {
  if (IS_DEMO) { logDemoWrite('deleteNotice'); return; }
  await deleteDoc(doc(db, 'notices', notice.id));
  if (notice.imagePath) {
    await deleteObject(ref(storage, notice.imagePath)).catch(() => {});
  }
}

import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { PROJECT_ROLES } from '../data/pointsConfig';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * Club projects, readable by every active member. Each role is stored as
 * { key, name } — key is memberKey(email), so members can find their own roles
 * (and earn the points) without project records exposing anyone's email.
 *
 * projects/{id}: { name, date, imageUrl, imagePath,
 *                  roles: { chairperson, secretary, treasurer }  // { key, name } | null
 *                  rolePoints: { chairperson, secretary, treasurer },
 *                  createdAt, updatedAt }
 */

export async function getProjects() {
  if (IS_DEMO) return [];
  const snap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

const defaultRolePoints = () =>
  Object.fromEntries(PROJECT_ROLES.map(r => [r.id, r.points]));

/**
 * Create (no `id`) or update a project. `imageFile` replaces the image when
 * given; `removeImage` clears it. Returns the project id.
 */
export async function saveProject({ id, name, date, roles, imageFile, removeImage, existing }) {
  if (IS_DEMO) { console.info('[DEMO] saveProject — not persisted.'); return id ?? 'demo'; }
  const docRef = id ? doc(db, 'projects', id) : doc(collection(db, 'projects'));

  let imageUrl  = existing?.imageUrl  ?? '';
  let imagePath = existing?.imagePath ?? '';
  const oldPath = imagePath;

  if (imageFile) {
    const safeName = imageFile.name.replace(/[^\w.-]+/g, '_');
    imagePath = `projects/${docRef.id}/${Date.now()}_${safeName}`;
    const fileRef = ref(storage, imagePath);
    await uploadBytes(fileRef, imageFile, { contentType: imageFile.type });
    imageUrl = await getDownloadURL(fileRef);
  } else if (removeImage) {
    imageUrl = '';
    imagePath = '';
  }

  await setDoc(docRef, {
    name:       name.trim(),
    date:       date ? Timestamp.fromDate(new Date(date + 'T00:00:00')) : null,
    imageUrl,
    imagePath,
    roles,
    // Keep the points a project was created with, so later changes to the
    // points table don't rewrite members' history
    rolePoints: existing?.rolePoints ?? defaultRolePoints(),
    createdAt:  existing?.createdAt ?? serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });

  // Only after the record points at the new image, remove the old file
  if (oldPath && oldPath !== imagePath) {
    await deleteObject(ref(storage, oldPath)).catch(() => {});
  }
  return docRef.id;
}

/** Remove the record first (members stop seeing it), then its image. */
export async function deleteProject(project) {
  if (IS_DEMO) { console.info('[DEMO] deleteProject — not persisted.'); return; }
  await deleteDoc(doc(db, 'projects', project.id));
  if (project.imagePath) {
    await deleteObject(ref(storage, project.imagePath)).catch(() => {});
  }
}

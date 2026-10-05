import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { IS_DEMO } from '../config/env';

/**
 * Storage paths (each one guarded by storage.rules):
 *   profiles/{email}/photo        — one profile photo per member
 *   events/{eventId}/{filename}   — event photos and sign sheets
 * Project images and orientation files are handled by their own services.
 */

const profilePhotoRef = (email) => ref(storage, `profiles/${email.toLowerCase()}/photo`);

/**
 * Upload one photo file for an event.
 * Returns the public download URL.
 */
export async function uploadEventPhoto(eventId, file) {
  if (IS_DEMO) {
    // Return a local blob URL — preview only, not persisted across page refresh
    return URL.createObjectURL(file);
  }
  const ext      = file.name.split('.').pop().toLowerCase();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const photoRef = ref(storage, `events/${eventId}/${filename}`);
  await uploadBytes(photoRef, file);
  return await getDownloadURL(photoRef);
}

/**
 * Upload a member's profile photo.
 * Uses a fixed storage path (profiles/{email}/photo) so each new upload
 * replaces the previous one — only one file is ever stored per user.
 */
export async function uploadProfilePhoto(email, file) {
  if (IS_DEMO) {
    return URL.createObjectURL(file);
  }
  const photoRef = profilePhotoRef(email);
  await uploadBytes(photoRef, file, { contentType: file.type });
  return await getDownloadURL(photoRef);
}

/**
 * Delete a member's profile photo (best-effort; fine if they never had one).
 */
export async function deleteProfilePhoto(email) {
  if (IS_DEMO) return;
  try {
    await deleteObject(profilePhotoRef(email));
  } catch (err) {
    if (err.code !== 'storage/object-not-found') {
      console.warn('[storageService] deleteProfilePhoto skipped:', err.code);
    }
  }
}

/**
 * Delete a photo from Firebase Storage by its download URL.
 * Safe to call in demo mode (no-op).
 */
export async function deleteEventPhoto(url) {
  if (IS_DEMO || !url || url.startsWith('blob:')) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    // Not critical — file may already be gone
    console.warn('[storageService] deleteEventPhoto skipped:', err.code);
  }
}

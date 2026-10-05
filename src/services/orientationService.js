import {
  collection, doc, getDocs, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { docsWithIds, logDemoWrite } from './firestoreUtils';
import { MOCK_ORIENTATION } from '../data/mockData';
import { IS_DEMO } from '../config/env';

export const MAX_ORIENTATION_MB = 25;

/**
 * Allowed orientation files, by extension. The content type sent to Storage
 * comes from this table (not the browser, which leaves it blank for some
 * files on Windows). Keep in sync with the orientation match in storage.rules.
 */
export const ORIENTATION_TYPES = {
  pdf:  { type: 'application/pdf',                                                          icon: 'fa-file-pdf',        color: 'text-red-400'    },
  doc:  { type: 'application/msword',                                                       icon: 'fa-file-word',       color: 'text-blue-400'   },
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  icon: 'fa-file-word',       color: 'text-blue-400'   },
  ppt:  { type: 'application/vnd.ms-powerpoint',                                            icon: 'fa-file-powerpoint', color: 'text-orange-400' },
  pptx: { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: 'fa-file-powerpoint', color: 'text-orange-400' },
  xls:  { type: 'application/vnd.ms-excel',                                                 icon: 'fa-file-excel',      color: 'text-green-400'  },
  xlsx: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        icon: 'fa-file-excel',      color: 'text-green-400'  },
  jpg:  { type: 'image/jpeg', icon: 'fa-file-image', color: 'text-purple-400' },
  jpeg: { type: 'image/jpeg', icon: 'fa-file-image', color: 'text-purple-400' },
  png:  { type: 'image/png',  icon: 'fa-file-image', color: 'text-purple-400' },
  webp: { type: 'image/webp', icon: 'fa-file-image', color: 'text-purple-400' },
  mp4:  { type: 'video/mp4',  icon: 'fa-file-video', color: 'text-pink-400'   },
};

export const ORIENTATION_ACCEPT = Object.keys(ORIENTATION_TYPES).map(ext => '.' + ext).join(',');

export const fileExtension = (name = '') => name.split('.').pop().toLowerCase();

/** Returns an error message for a file that can't be uploaded, else null. */
export function validateOrientationFile(file) {
  if (!file) return 'Please choose a file.';
  if (!ORIENTATION_TYPES[fileExtension(file.name)]) {
    return 'Allowed files: PDF, Word, PowerPoint, Excel, JPG/PNG/WebP images and MP4 videos.';
  }
  if (file.size > MAX_ORIENTATION_MB * 1024 * 1024) {
    return `The file is larger than ${MAX_ORIENTATION_MB} MB.`;
  }
  return null;
}

export async function getOrientationFiles() {
  if (IS_DEMO) return MOCK_ORIENTATION;
  return docsWithIds(await getDocs(query(collection(db, 'orientation'), orderBy('uploadedAt', 'desc'))));
}

/**
 * Upload a file to orientation/{id}/{name} and record it in Firestore.
 * onProgress(percent) is called while uploading.
 */
export async function uploadOrientationFile({ title, description, file, uploadedBy }, onProgress) {
  if (IS_DEMO) { logDemoWrite('uploadOrientationFile'); return; }
  const ext      = fileExtension(file.name);
  const docRef   = doc(collection(db, 'orientation'));
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path     = `orientation/${docRef.id}/${safeName}`;
  const fileRef  = ref(storage, path);

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, {
      contentType: ORIENTATION_TYPES[ext].type,
      // Opens in the browser where possible (PDF, images, video), and keeps
      // the original file name when downloaded.
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
    task.on('state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve,
    );
  });

  try {
    await setDoc(docRef, {
      title:        title.trim(),
      description:  (description ?? '').trim(),
      fileName:     file.name,
      fileType:     ext,
      size:         file.size,
      storagePath:  path,
      url:          await getDownloadURL(fileRef),
      uploadedBy,
      uploadedAt:   serverTimestamp(),
    });
  } catch (err) {
    // Don't leave an orphaned file in Storage if the record couldn't be saved
    await deleteObject(fileRef).catch(() => {});
    throw err;
  }
}

/**
 * Remove the record first (members stop seeing it immediately), then the file.
 */
export async function deleteOrientationFile(item) {
  if (IS_DEMO) { logDemoWrite('deleteOrientationFile'); return; }
  await deleteDoc(doc(db, 'orientation', item.id));
  if (item.storagePath) {
    await deleteObject(ref(storage, item.storagePath)).catch(err => {
      console.warn('[orientationService] file delete skipped:', err.code);
    });
  }
}

/**
 * Format a Firestore Timestamp (or JS Date / ISO string) → readable date string.
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateShort(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/**
 * Compute attendance percentage (0-100).
 */
export function calcAttendanceRate(attended, total) {
  if (!total) return 0;
  return Math.round((attended / total) * 100);
}

/**
 * Text colour for an attendance rate: green 75%+, gold 50–74%, red below 50%.
 * Grey when the member has no marked events yet (0% would look like a failure).
 */
export function rateColor(rate, hasEvents = true) {
  if (!hasEvents) return 'text-portal-muted';
  if (rate >= 75) return 'text-green-400';
  if (rate >= 50) return 'text-portal-gold';
  return 'text-portal-red';
}

/**
 * Photo formats accepted for uploads. Keep in sync with isPhoto() in
 * storage.rules (SVG and other image/* types are rejected there).
 */
export const PHOTO_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',');
export const isAllowedPhoto = (file) => PHOTO_TYPES.includes(file?.type);

/**
 * Return the URL only if it is a plain https:// link, else undefined.
 * Use for href/src values that come from Firestore, so a tampered record
 * can't inject a javascript: or data: link.
 */
export function safeHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url) ? url : undefined;
}

/**
 * Return first letter(s) for an avatar fallback.
 */
export function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

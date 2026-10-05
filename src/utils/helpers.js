/** A Firestore Timestamp, JS Date or date string as a JS Date. */
const toJsDate = (value) => (value?.toDate ? value.toDate() : new Date(value));

/**
 * Format a Firestore Timestamp (or JS Date / ISO string) → readable date string.
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return toJsDate(timestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateShort(timestamp) {
  if (!timestamp) return 'N/A';
  return toJsDate(timestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** A stored date as a date-input value ('YYYY-MM-DD', local time), or ''. */
export function toDateInputValue(timestamp) {
  if (!timestamp) return '';
  return toJsDate(timestamp).toLocaleDateString('en-CA');   // en-CA formats as YYYY-MM-DD
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
 * Opaque per-member key (SHA-256 of the lowercase email). Used where every
 * member can read the data (leaderboard, projects) so a member can find
 * their own entries without anyone's email being exposed.
 */
export async function memberKey(email) {
  const data = new TextEncoder().encode((email ?? '').trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
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

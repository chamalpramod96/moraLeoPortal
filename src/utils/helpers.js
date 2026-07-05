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

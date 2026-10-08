/**
 * Notice Board ordering — pure functions, covered by notices.test.js.
 * A notice's `date` is a Firestore Timestamp at local midnight of the event day.
 */

const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

/** Local midnight of the given day. */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** True if the notice is for today (local time). */
export function isNoticeToday(notice, now = new Date()) {
  const d = toDate(notice.date);
  return !!d && startOfDay(d).getTime() === startOfDay(now).getTime();
}

/**
 * Splits notices into { upcoming, past }: today and later first, soonest
 * at the top; then earlier ones, most recent at the top. Notices without
 * a date count as upcoming and come last.
 */
export function splitNotices(notices, now = new Date()) {
  const today = startOfDay(now).getTime();
  const time  = (n) => toDate(n.date)?.getTime();
  const upcoming = notices
    .filter(n => time(n) === undefined || time(n) >= today)
    .sort((a, b) => (time(a) ?? Infinity) - (time(b) ?? Infinity));
  const past = notices
    .filter(n => time(n) !== undefined && time(n) < today)
    .sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}

/** '18:30' → '6:30 PM'; '' → ''. */
export function formatTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

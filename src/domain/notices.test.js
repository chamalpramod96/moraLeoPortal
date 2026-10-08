import { describe, it, expect } from 'vitest';
import { splitNotices, isNoticeToday, formatTime } from './notices';

const day = (y, m, d) => ({ toDate: () => new Date(y, m - 1, d) });   // like a Timestamp
const now = new Date(2026, 9, 8, 15, 30);                            // 8 Oct 2026, 3:30 PM

describe('splitNotices', () => {
  const notices = [
    { id: 'past-old', date: day(2026, 9, 1) },
    { id: 'later',    date: day(2026, 11, 20) },
    { id: 'today',    date: day(2026, 10, 8) },
    { id: 'past-new', date: day(2026, 10, 7) },
    { id: 'soon',     date: day(2026, 10, 12) },
    { id: 'no-date' },
  ];

  it('puts today and later first, soonest at the top, undated last', () => {
    expect(splitNotices(notices, now).upcoming.map(n => n.id)).toEqual(['today', 'soon', 'later', 'no-date']);
  });

  it('puts earlier notices after, most recent first', () => {
    expect(splitNotices(notices, now).past.map(n => n.id)).toEqual(['past-new', 'past-old']);
  });
});

describe('isNoticeToday', () => {
  it('is true only for the same calendar day', () => {
    expect(isNoticeToday({ date: day(2026, 10, 8) }, now)).toBe(true);
    expect(isNoticeToday({ date: day(2026, 10, 9) }, now)).toBe(false);
    expect(isNoticeToday({}, now)).toBe(false);
  });
});

describe('formatTime', () => {
  it('shows 24-hour input times as 12-hour times', () => {
    expect(formatTime('18:30')).toBe('6:30 PM');
    expect(formatTime('09:05')).toBe('9:05 AM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:15')).toBe('12:15 PM');
    expect(formatTime('')).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
});

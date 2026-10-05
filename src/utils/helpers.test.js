import { describe, it, expect } from 'vitest';
import {
  formatDate, formatDateShort, toDateInputValue, calcAttendanceRate, rateColor,
  isAllowedPhoto, safeHttpsUrl, memberKey, initials,
} from './helpers';

// Firestore Timestamps only need toDate() here
const ts = (date) => ({ toDate: () => date });

describe('dates', () => {
  const sep20 = new Date(2025, 8, 20, 12, 0);   // local noon, so no timezone edge

  it('formats Timestamps and Dates', () => {
    expect(formatDate(ts(sep20))).toBe('September 20, 2025');
    expect(formatDateShort(sep20)).toBe('Sep 20, 2025');
  });

  it('shows N/A for a missing date', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDateShort(undefined)).toBe('N/A');
  });

  it('converts a stored date to a date-input value', () => {
    expect(toDateInputValue(ts(sep20))).toBe('2025-09-20');
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('attendance rate', () => {
  it('rounds to a whole percent and handles no events', () => {
    expect(calcAttendanceRate(2, 3)).toBe(67);
    expect(calcAttendanceRate(0, 0)).toBe(0);
  });

  it('colours: green 75%+, gold 50–74%, red below, grey with no events', () => {
    expect(rateColor(75)).toBe('text-green-400');
    expect(rateColor(50)).toBe('text-portal-gold');
    expect(rateColor(49)).toBe('text-portal-red');
    expect(rateColor(0, false)).toBe('text-portal-muted');
  });
});

describe('uploads and links', () => {
  it('accepts photo types only (no SVG)', () => {
    expect(isAllowedPhoto({ type: 'image/jpeg' })).toBe(true);
    expect(isAllowedPhoto({ type: 'image/heic' })).toBe(true);
    expect(isAllowedPhoto({ type: 'image/svg+xml' })).toBe(false);
    expect(isAllowedPhoto(null)).toBe(false);
  });

  it('safeHttpsUrl keeps https links and drops anything else', () => {
    expect(safeHttpsUrl('https://firebasestorage.googleapis.com/x')).toBe('https://firebasestorage.googleapis.com/x');
    expect(safeHttpsUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpsUrl('data:text/html,hi')).toBeUndefined();
    expect(safeHttpsUrl('http://example.com')).toBeUndefined();
    expect(safeHttpsUrl(undefined)).toBeUndefined();
  });
});

describe('memberKey', () => {
  it('is the SHA-256 of the trimmed, lowercase email', async () => {
    const key = await memberKey('  Super@Demo.LK ');
    expect(key).toBe('30560d9717ea8700e5e6508b9c79dc6811aa3cbc1e13c69d44a9a43b67cddfce');
    expect(await memberKey('super@demo.lk')).toBe(key);
  });
});

describe('initials', () => {
  it('takes up to two initials', () => {
    expect(initials('amal perera silva')).toBe('AP');
    expect(initials('Nimali')).toBe('N');
    expect(initials('')).toBe('?');
  });
});

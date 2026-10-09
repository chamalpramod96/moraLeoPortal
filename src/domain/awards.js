import { NOMINATIONS_PER_CATEGORY } from '../data/awardCategories';

/**
 * Project award nominations — pure helpers, covered by awards.test.js.
 * An entry is { nominations: [string × 3], comment: string }.
 */

export const emptyEntry = () => ({
  nominations: Array(NOMINATIONS_PER_CATEGORY).fill(''),
  comment: '',
});

/** A stored or edited entry, trimmed and always with exactly 3 nominations. */
export function normalizeEntry(raw) {
  const noms = Array.isArray(raw?.nominations) ? raw.nominations : [];
  return {
    nominations: Array.from({ length: NOMINATIONS_PER_CATEGORY }, (_, i) => String(noms[i] ?? '').trim()),
    comment: String(raw?.comment ?? '').trim(),
  };
}

/** True if two entries hold the same (trimmed) values. */
export function isSameEntry(a, b) {
  const x = normalizeEntry(a), y = normalizeEntry(b);
  return x.comment === y.comment && x.nominations.every((n, i) => n === y.nominations[i]);
}

/** Number of categories with at least one nomination. */
export const countNominated = (categories, entries) =>
  categories.filter(c => normalizeEntry(entries[c.id]).nominations.some(Boolean)).length;

const BOM = String.fromCharCode(0xFEFF);   // Excel reads the CSV as UTF-8

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * All categories and their nominations as CSV (opens in Excel; the BOM keeps
 * non-English characters intact).
 */
export function nominationsCsv(groups, entries) {
  const header = ['Section', 'No', 'Award Category', '1st Nomination', '2nd Nomination', '3rd Nomination', 'Comment'];
  const rows = groups.flatMap(g => g.categories.map(c => {
    const e = normalizeEntry(entries[c.id]);
    return [g.title, c.no, c.label, ...e.nominations, e.comment];
  }));
  return BOM + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

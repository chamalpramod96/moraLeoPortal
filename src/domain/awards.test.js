import { describe, it, expect } from 'vitest';
import { emptyEntry, normalizeEntry, isSameEntry, countNominated, nominationsCsv } from './awards';
import { AWARD_GROUPS, AWARD_CATEGORIES } from '../data/awardCategories';

describe('award categories', () => {
  it('has the 37 categories, numbered 1–37, with unique ids', () => {
    expect(AWARD_CATEGORIES).toHaveLength(37);
    expect(AWARD_CATEGORIES.map(c => c.no)).toEqual(Array.from({ length: 37 }, (_, i) => i + 1));
    expect(new Set(AWARD_CATEGORIES.map(c => c.id)).size).toBe(37);
  });

  it('is split into the three sections', () => {
    expect(AWARD_GROUPS.map(g => [g.title, g.categories.length])).toEqual([
      ['Projects Awards', 24], ['Joint Projects Awards', 6], ['Lions Global Causes Awards', 7],
    ]);
  });
});

describe('entries', () => {
  it('normalizes to three trimmed nominations and a comment', () => {
    expect(normalizeEntry({ nominations: [' Blood Camp ', 'Book Drive'], comment: ' ok ' }))
      .toEqual({ nominations: ['Blood Camp', 'Book Drive', ''], comment: 'ok' });
    expect(normalizeEntry(undefined)).toEqual(emptyEntry());
  });

  it('compares entries ignoring extra spaces', () => {
    expect(isSameEntry({ nominations: ['A ', '', ''], comment: '' }, { nominations: ['A'], comment: ' ' })).toBe(true);
    expect(isSameEntry({ nominations: ['A'] }, { nominations: ['B'] })).toBe(false);
  });

  it('counts categories with at least one nomination', () => {
    const entries = { a01: { nominations: ['', 'X', ''] }, a02: { nominations: ['', '', ''], comment: 'later' } };
    expect(countNominated(AWARD_CATEGORIES, entries)).toBe(1);
  });
});

describe('nominationsCsv', () => {
  it('lists every category with its nominations, quoting commas and quotes', () => {
    const csv = nominationsCsv(AWARD_GROUPS, {
      a01: { nominations: ['Kids Camp, 2026', 'Say "Hi"', ''], comment: 'Strong entry' },
    });
    const lines = csv.replace(String.fromCharCode(0xFEFF), '').trim().split('\r\n');
    expect(lines).toHaveLength(38);   // header + 37 categories
    expect(lines[0]).toBe('Section,No,Award Category,1st Nomination,2nd Nomination,3rd Nomination,Comment');
    expect(lines[1]).toBe('Projects Awards,1,Best Project for Spotlight on Children,"Kids Camp, 2026","Say ""Hi""",,Strong entry');
    expect(lines[37]).toMatch(/^Lions Global Causes Awards,37,/);
  });
});

import { describe, it, expect } from 'vitest';
import {
  LEVELS, getLevelInfo, EVENT_POINT_CATEGORIES, ACTIVE_EVENT_POINT_CATEGORIES,
  MANUAL_POINT_CATEGORIES, PROJECT_ROLES, isAttended, isHybridEvent,
  getManualCategory, groupedEventCategories,
} from './pointsConfig';

describe('levels', () => {
  it('thresholds go up strictly', () => {
    LEVELS.slice(1).forEach((lvl, i) => expect(lvl.minPoints).toBeGreaterThan(LEVELS[i].minPoints));
  });

  it('every level is named "Level NN", starting at Level 00', () => {
    LEVELS.forEach(l => expect(l.label).toBe(`Level ${String(l.level).padStart(2, '0')}`));
  });

  it('only levels 8–10 have a title', () => {
    expect(LEVELS.filter(l => l.unlock).map(l => [l.level, l.unlock])).toEqual([
      [8, 'Leo Star'], [9, 'Leo Master'], [10, 'Leo Legend'],
    ]);
  });

  it('getLevelInfo finds the level and progress to the next one', () => {
    expect(getLevelInfo(0).current.level).toBe(0);
    expect(getLevelInfo(999).current.level).toBe(0);
    expect(getLevelInfo(1000).current.level).toBe(1);

    const mid = getLevelInfo(1500);   // halfway from 1,000 to 2,000
    expect(mid.next.level).toBe(2);
    expect(mid.progressPct).toBe(50);
  });

  it('at the top level there is no next level', () => {
    const top = getLevelInfo(250000);
    expect(top.current.level).toBe(10);
    expect(top.next).toBeNull();
    expect(top.progressPct).toBe(100);
  });
});

describe('categories', () => {
  it('every category id is unique', () => {
    const ids = [...EVENT_POINT_CATEGORIES, ...MANUAL_POINT_CATEGORIES].map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('retired categories are hidden from new events but kept for old ones', () => {
    expect(ACTIVE_EVENT_POINT_CATEGORIES.some(c => c.retired)).toBe(false);
    const flat = (groups) => Object.values(groups).flat().map(c => c.id);
    expect(flat(groupedEventCategories())).not.toContain('club_meeting_board');
    expect(flat(groupedEventCategories('club_meeting_board'))).toContain('club_meeting_board');
  });

  it('project role points match the Club Involvements points', () => {
    const pts = Object.fromEntries(PROJECT_ROLES.map(r => [r.id, r.points]));
    expect(pts.chairperson).toBe(getManualCategory('inv_club_chairman').points);
    expect(pts.secretary).toBe(getManualCategory('inv_club_sec').points);
    expect(pts.treasurer).toBe(getManualCategory('inv_club_sec').points);
  });
});

describe('attendance helpers', () => {
  it('attended and attended_online both count as attending', () => {
    expect(isAttended('attended')).toBe(true);
    expect(isAttended('attended_online')).toBe(true);
    expect(isAttended('absent')).toBe(false);
    expect(isAttended('excused')).toBe(false);
  });

  it('only hybrid club meetings are hybrid', () => {
    expect(isHybridEvent({ pointsCategory: 'club_meeting_hybrid' })).toBe(true);
    expect(isHybridEvent({ pointsCategory: 'club_meeting_physical' })).toBe(false);
    expect(isHybridEvent(null)).toBe(false);
  });
});

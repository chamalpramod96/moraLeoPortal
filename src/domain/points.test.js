import { describe, it, expect } from 'vitest';
import {
  eventPointsFor, calcEventPoints, calcManualPoints, projectRolesFor,
  computeMemberPoints, rankRows,
} from './points';

const hybrid   = { id: 'h', pointsCategory: 'club_meeting_hybrid', pointsValue: 100, onlinePointsValue: 50 };
const service  = { id: 's', pointsCategory: 'club_project_service', pointsValue: 25 };
const retired  = { id: 'r', pointsCategory: 'club_meeting_board',   pointsValue: 50 };   // retired category
const noPoints = { id: 'n', pointsCategory: '' };

describe('eventPointsFor', () => {
  it('gives the event points for attending', () => {
    expect(eventPointsFor('attended', service)).toBe(25);
  });

  it('gives nothing for absent, excused or unmarked', () => {
    expect(eventPointsFor('absent', service)).toBe(0);
    expect(eventPointsFor('excused', service)).toBe(0);
    expect(eventPointsFor(undefined, service)).toBe(0);
  });

  it('gives nothing when the event is missing (e.g. deleted)', () => {
    expect(eventPointsFor('attended', undefined)).toBe(0);
  });

  it('hybrid meetings: physical earns full points, online earns online points', () => {
    expect(eventPointsFor('attended', hybrid)).toBe(100);
    expect(eventPointsFor('attended_online', hybrid)).toBe(50);
  });

  it('hybrid online falls back to the category online points when the event has none', () => {
    const { onlinePointsValue: _omit, ...older } = hybrid;
    expect(eventPointsFor('attended_online', older)).toBe(50);
  });

  it('an online mark on an event that is no longer hybrid counts as attended', () => {
    expect(eventPointsFor('attended_online', service)).toBe(25);
  });

  it('events on a retired category keep their stored points', () => {
    expect(eventPointsFor('attended', retired)).toBe(50);
  });

  it('events without a points category earn 0', () => {
    expect(eventPointsFor('attended', noPoints)).toBe(0);
  });
});

describe('calcEventPoints', () => {
  const events = [hybrid, service, retired];
  const attendance = [
    { memberId: 'amal@x.lk', eventId: 'h', status: 'attended_online' },
    { memberId: 'amal@x.lk', eventId: 's', status: 'attended' },
    { memberId: 'amal@x.lk', eventId: 'r', status: 'absent' },
    { memberId: 'nimal@x.lk', eventId: 'h', status: 'attended' },
    { memberId: 'amal@x.lk', eventId: 'gone', status: 'attended' },   // deleted event
  ];

  it('adds up only this member’s attended events', () => {
    expect(calcEventPoints('amal@x.lk', attendance, events)).toBe(75);
    expect(calcEventPoints('nimal@x.lk', attendance, events)).toBe(100);
  });

  it('matches emails case-insensitively', () => {
    expect(calcEventPoints('Amal@X.lk', attendance, events)).toBe(75);
  });
});

describe('calcManualPoints', () => {
  it('sums this member’s entries and ignores bad values', () => {
    const pts = [
      { memberId: 'amal@x.lk', points: 500 },
      { memberId: 'amal@x.lk', points: '100' },
      { memberId: 'amal@x.lk', points: 'oops' },
      { memberId: 'nimal@x.lk', points: 250 },
    ];
    expect(calcManualPoints('amal@x.lk', pts)).toBe(600);
  });
});

describe('projectRolesFor', () => {
  const projects = [
    { id: 'p1', name: 'Blood Donation', roles: { chairperson: { key: 'k1' }, secretary: { key: 'k2' }, treasurer: null },
      rolePoints: { chairperson: 250, secretary: 150, treasurer: 150 } },
    { id: 'p2', name: 'Old Project', roles: { treasurer: { key: 'k1' } } },    // no stored rolePoints
  ];

  it('lists every role the member holds, with the points stored on the project', () => {
    expect(projectRolesFor('k1', projects)).toEqual([
      expect.objectContaining({ projectId: 'p1', role: 'chairperson', roleLabel: 'Chairperson', points: 250 }),
      expect.objectContaining({ projectId: 'p2', role: 'treasurer',   roleLabel: 'Treasurer',   points: 150 }),
    ]);
  });

  it('returns nothing without a key', () => {
    expect(projectRolesFor(null, projects)).toEqual([]);
  });
});

describe('computeMemberPoints', () => {
  it('total = events + project roles + manual points', () => {
    const result = computeMemberPoints(
      'amal@x.lk',
      [{ memberId: 'amal@x.lk', eventId: 's', status: 'attended' }],
      [service],
      [{ memberId: 'amal@x.lk', points: 100 }],
      [{ id: 'p', roles: { secretary: { key: 'k' } }, rolePoints: { secretary: 150 } }],
      'k',
    );
    expect(result).toEqual({ eventPoints: 25, projectPoints: 150, manualPoints: 100, total: 275 });
  });

  it('project points count as 0 without the member key', () => {
    const result = computeMemberPoints('a@x.lk', [], [], [], [{ id: 'p', roles: { secretary: { key: 'k' } } }]);
    expect(result.total).toBe(0);
  });
});

describe('rankRows', () => {
  it('sorts by total, then name, and shares places on ties (1, 2, 2, 4)', () => {
    const rows = rankRows([
      { name: 'Dilan', total: 50 },
      { name: 'Amal',  total: 300 },
      { name: 'Chami', total: 120 },
      { name: 'Bimal', total: 120 },
    ]);
    expect(rows.map(r => [r.name, r.rank])).toEqual([
      ['Amal', 1], ['Bimal', 2], ['Chami', 2], ['Dilan', 4],
    ]);
  });
});

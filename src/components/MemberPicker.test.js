import { describe, it, expect } from 'vitest';
import { matchMembers } from './MemberPicker';

const members = [
  { email: 'a@x.lk', fullName: 'Leo Akila Buddhika',            memberId: '4703831' },
  { email: 'c@x.lk', fullName: 'Leo Lion Chamal Pramod',        memberId: '6012135' },
  { email: 'd@x.lk', fullName: 'Leo Dewmini Chamodya',          memberId: '27152279' },
  { email: 'k@x.lk', fullName: 'Leo Kasun Sapumohotti',         memberId: '6047384' },
  { email: 'm@x.lk', fullName: 'Leo Mamith Fernando',           memberId: '26868789' },
];
const names = (list) => list.map(m => m.fullName);

describe('matchMembers', () => {
  it('finds members by first name, ignoring the "Leo" / "Leo Lion" prefix', () => {
    expect(names(matchMembers(members, 'cha'))).toEqual(['Leo Lion Chamal Pramod', 'Leo Dewmini Chamodya']);
    expect(names(matchMembers(members, 'KASUN'))).toEqual(['Leo Kasun Sapumohotti']);
  });

  it('matches surnames, any part of the name, and member IDs', () => {
    expect(names(matchMembers(members, 'fernando'))).toEqual(['Leo Mamith Fernando']);
    expect(names(matchMembers(members, 'mohot'))).toEqual(['Leo Kasun Sapumohotti']);
    expect(names(matchMembers(members, '6012'))).toEqual(['Leo Lion Chamal Pramod']);
  });

  it('leaves out members already chosen for another role', () => {
    expect(names(matchMembers(members, 'cha', new Set(['c@x.lk'])))).toEqual(['Leo Dewmini Chamodya']);
  });

  it('shows everyone (up to the limit) before anything is typed', () => {
    expect(matchMembers(members, '')).toHaveLength(5);
    expect(matchMembers(members, '', new Set(), 3)).toHaveLength(3);
  });

  it('returns nothing when no one matches', () => {
    expect(matchMembers(members, 'zzz')).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { ADMIN_ROLES, isAdminRole, assignableRoles } from './roles';

describe('roles', () => {
  it('secretary, president and superAdmin are admins; members are not', () => {
    expect(ADMIN_ROLES).toEqual(['secretary', 'president', 'superAdmin']);
    expect(isAdminRole('member')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('only a Super Admin can make another Super Admin', () => {
    expect(assignableRoles(false)).not.toContain('superAdmin');
    expect(assignableRoles(true)).toContain('superAdmin');
  });
});

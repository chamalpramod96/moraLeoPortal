/**
 * Member roles. Who may do what is enforced by firestore.rules and
 * storage.rules (isAdmin / isSuperAdmin there); keep these lists in sync.
 */
export const ROLES = {
  MEMBER:      'member',
  PRESIDENT:   'president',
  SECRETARY:   'secretary',
  SUPER_ADMIN: 'superAdmin',
};

/** Roles with management access (Members, Manage Events, Projects, files). */
export const ADMIN_ROLES = [ROLES.SECRETARY, ROLES.PRESIDENT, ROLES.SUPER_ADMIN];

export const isAdminRole = (role) => ADMIN_ROLES.includes(role);

/** Roles an admin may give a member: only a Super Admin can make another. */
export const assignableRoles = (isSuperAdmin) => (
  isSuperAdmin
    ? [ROLES.MEMBER, ROLES.PRESIDENT, ROLES.SECRETARY, ROLES.SUPER_ADMIN]
    : [ROLES.MEMBER, ROLES.PRESIDENT, ROLES.SECRETARY]
);

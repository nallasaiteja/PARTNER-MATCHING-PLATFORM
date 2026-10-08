export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HQ_SERVICE_TEAM: 'HQ_SERVICE_TEAM',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  BRANCH_STAFF: 'BRANCH_STAFF',
  BRANCH_AGENT: 'BRANCH_AGENT',
  FRANCHISE_MANAGER: 'FRANCHISE_MANAGER',
  FRANCHISE_STAFF: 'FRANCHISE_STAFF',
  FRANCHISE_AGENT: 'FRANCHISE_AGENT',
  MEMBER: 'MEMBER',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const Permission = {
  MEMBER_EXPORT: 'MEMBER_EXPORT',
  MEMBER_BLOCK: 'MEMBER_BLOCK',
  MEMBER_UNBLOCK: 'MEMBER_UNBLOCK',
  PROFILE_VIEW: 'PROFILE_VIEW',
  PROFILE_CREATE: 'PROFILE_CREATE',
  PROFILE_EDIT: 'PROFILE_EDIT',
  STAFF_CREATE: 'STAFF_CREATE',
  STAFF_EDIT: 'STAFF_EDIT',
  STAFF_BLOCK: 'STAFF_BLOCK',
  STAFF_TERMINATE: 'STAFF_TERMINATE',
  INVOICE_RAISE: 'INVOICE_RAISE',
  INVOICE_APPROVE: 'INVOICE_APPROVE',
  TICKET_CLOSE: 'TICKET_CLOSE',
  PASSWORD_ADMIN: 'PASSWORD_ADMIN',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission) as PermissionType[],
  [Role.ADMIN]: Object.values(Permission) as PermissionType[],
  [Role.HQ_SERVICE_TEAM]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.TICKET_CLOSE,
  ],
  [Role.BRANCH_MANAGER]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.MEMBER_BLOCK,
    Permission.INVOICE_RAISE,
  ],
  [Role.BRANCH_STAFF]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.INVOICE_RAISE,
  ],
  [Role.BRANCH_AGENT]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.INVOICE_RAISE,
  ],
  [Role.FRANCHISE_MANAGER]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.MEMBER_BLOCK,
    Permission.INVOICE_APPROVE,
    Permission.INVOICE_RAISE,
    Permission.STAFF_CREATE,
    Permission.STAFF_EDIT,
    Permission.STAFF_BLOCK,
    Permission.STAFF_TERMINATE,
  ],
  [Role.FRANCHISE_STAFF]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.INVOICE_RAISE,
  ],
  [Role.FRANCHISE_AGENT]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_CREATE,
    Permission.PROFILE_EDIT,
    Permission.INVOICE_RAISE,
  ],
  [Role.MEMBER]: [],
};

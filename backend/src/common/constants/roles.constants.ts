/**
 * RBAC Role Constants
 * Single source of truth for all roles in the system.
 * Mirrors the RoleType enum in schema.prisma.
 */
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

/**
 * Staff Account Status Constants
 */
export const StaffStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
  TERMINATED: 'TERMINATED',
} as const;

export type StaffStatusType = (typeof StaffStatus)[keyof typeof StaffStatus];

/**
 * Staff Division Constants
 */
export const StaffDivision = {
  FREE_TEAM: 'FREE_TEAM',
  HQ_SERVICE_TEAM: 'HQ_SERVICE_TEAM',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

/**
 * Permission Constants
 * All system permissions as named constants.
 */
export const Permission = {
  // Member data
  MEMBER_EXPORT: 'MEMBER_EXPORT',
  MEMBER_BLOCK: 'MEMBER_BLOCK',
  MEMBER_UNBLOCK: 'MEMBER_UNBLOCK',
  PROFILE_VIEW: 'PROFILE_VIEW',
  PROFILE_CREATE: 'PROFILE_CREATE',
  PROFILE_EDIT: 'PROFILE_EDIT',

  // Staff management
  STAFF_CREATE: 'STAFF_CREATE',
  STAFF_EDIT: 'STAFF_EDIT',
  STAFF_BLOCK: 'STAFF_BLOCK',
  STAFF_TERMINATE: 'STAFF_TERMINATE',

  // Invoice
  INVOICE_RAISE: 'INVOICE_RAISE',
  INVOICE_APPROVE: 'INVOICE_APPROVE',

  // Tickets
  TICKET_CLOSE: 'TICKET_CLOSE',

  // Password admin
  PASSWORD_ADMIN: 'PASSWORD_ADMIN',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

/**
 * Role → Permission Map
 * Defines which permissions each role has by default.
 * Scope restrictions (branch/franchise/ownership) are enforced separately in guards.
 */
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

  [Role.MEMBER]: [
    Permission.PROFILE_VIEW,
    Permission.PROFILE_EDIT,
  ],
};

/**
 * Roles that can log in as staff
 */
export const STAFF_ROLES: RoleType[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.HQ_SERVICE_TEAM,
  Role.BRANCH_MANAGER,
  Role.BRANCH_STAFF,
  Role.BRANCH_AGENT,
  Role.FRANCHISE_MANAGER,
  Role.FRANCHISE_STAFF,
  Role.FRANCHISE_AGENT,
];

/**
 * Roles that block login entirely
 */
export const LOGIN_BLOCKED_STATUSES: StaffStatusType[] = [
  StaffStatus.BLOCKED,
  StaffStatus.TERMINATED,
];

/**
 * Actions SUSPENDED staff cannot perform
 * (They can login + create/edit profiles only)
 */
export const SUSPENDED_BLOCKED_PERMISSIONS: PermissionType[] = [
  Permission.MEMBER_BLOCK,
  Permission.MEMBER_UNBLOCK,
  Permission.MEMBER_EXPORT,
  Permission.STAFF_CREATE,
  Permission.STAFF_EDIT,
  Permission.STAFF_BLOCK,
  Permission.STAFF_TERMINATE,
  Permission.INVOICE_APPROVE,
  Permission.INVOICE_RAISE,
  Permission.TICKET_CLOSE,
  Permission.PASSWORD_ADMIN,
];

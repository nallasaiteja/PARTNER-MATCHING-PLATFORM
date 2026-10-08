/**
 * RBAC Test Suite — Section 2
 * Tests all authorization rules without requiring a live server.
 * Run: npx ts-node src/tests/rbac.test.ts
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  Role,
  StaffStatus,
  ROLE_PERMISSIONS,
  Permission,
  SUSPENDED_BLOCKED_PERMISSIONS,
  LOGIN_BLOCKED_STATUSES,
} from '../common/constants/roles.constants';

// ─── Test Helpers ───────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`          ${e.message}`);
    failed++;
  }
}

function expect(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

// ─── Mock ScopeGuardService ─────────────────────────────────

function mockScopeCheck(
  actorRole: string,
  actorOrgId: string | null,
  profileOrgId: string,
  profileOwnerType: string,
  profileCreatorId?: string,
  actorId?: string,
) {
  // HQ roles: global access
  if (
    actorRole === Role.SUPER_ADMIN ||
    actorRole === Role.ADMIN ||
    actorRole === Role.HQ_SERVICE_TEAM
  ) return true;

  if (!actorOrgId) throw new ForbiddenException('No organization assigned');

  if (profileOwnerType === 'HQ') {
    throw new ForbiddenException('Profile owned by HQ');
  }

  if (
    actorRole === Role.BRANCH_AGENT ||
    actorRole === Role.FRANCHISE_AGENT
  ) {
    if (profileCreatorId !== actorId) {
      throw new ForbiddenException('Agents can only access own created profiles');
    }
    return true;
  }

  if (profileOrgId !== actorOrgId) {
    throw new ForbiddenException('Cross-branch access denied');
  }

  return true;
}

function mockFranchiseStaffScope(
  actorRole: string,
  actorOrgId: string | null,
  targetOrgId: string,
) {
  if (actorRole === Role.SUPER_ADMIN || actorRole === Role.ADMIN) return true;
  if (actorRole === Role.FRANCHISE_MANAGER) {
    if (targetOrgId !== actorOrgId) {
      throw new ForbiddenException('Franchise Manager cross-franchise denied');
    }
    return true;
  }
  throw new ForbiddenException('Role cannot manage staff');
}

// ─── Tests: Login / Status ──────────────────────────────────

console.log('\n📋 STAFF LOGIN STATUS TESTS');

test('ACTIVE staff: login allowed', () => {
  expect(!LOGIN_BLOCKED_STATUSES.includes(StaffStatus.ACTIVE as any), 'ACTIVE should not be in blocked list');
});

test('SUSPENDED staff: login allowed', () => {
  expect(!LOGIN_BLOCKED_STATUSES.includes(StaffStatus.SUSPENDED as any), 'SUSPENDED should not be in blocked list');
});

test('BLOCKED staff: login denied', () => {
  expect(LOGIN_BLOCKED_STATUSES.includes(StaffStatus.BLOCKED as any), 'BLOCKED must be in login-blocked list');
});

test('TERMINATED staff: login denied', () => {
  expect(LOGIN_BLOCKED_STATUSES.includes(StaffStatus.TERMINATED as any), 'TERMINATED must be in login-blocked list');
});

// ─── Tests: SUSPENDED Permissions ────────────────────────────

console.log('\n📋 SUSPENDED STAFF PERMISSION TESTS');

const suspendedAllowed = [Permission.PROFILE_CREATE, Permission.PROFILE_EDIT];
const suspendedBlocked = SUSPENDED_BLOCKED_PERMISSIONS;

test('SUSPENDED: profile create allowed', () => {
  expect(!suspendedBlocked.includes(Permission.PROFILE_CREATE), 'PROFILE_CREATE must not be blocked for suspended');
});

test('SUSPENDED: profile edit allowed', () => {
  expect(!suspendedBlocked.includes(Permission.PROFILE_EDIT), 'PROFILE_EDIT must not be blocked for suspended');
});

test('SUSPENDED: member export blocked', () => {
  expect(suspendedBlocked.includes(Permission.MEMBER_EXPORT), 'MEMBER_EXPORT must be blocked for suspended');
});

test('SUSPENDED: invoice approve blocked', () => {
  expect(suspendedBlocked.includes(Permission.INVOICE_APPROVE), 'INVOICE_APPROVE must be blocked for suspended');
});

test('SUSPENDED: staff create blocked', () => {
  expect(suspendedBlocked.includes(Permission.STAFF_CREATE), 'STAFF_CREATE must be blocked for suspended');
});

// ─── Tests: Export Permissions ───────────────────────────────

console.log('\n📋 MEMBER DATA EXPORT TESTS');

const exportAllowed = [Role.SUPER_ADMIN, Role.ADMIN];
const exportDenied = [
  Role.HQ_SERVICE_TEAM, Role.BRANCH_MANAGER, Role.BRANCH_STAFF,
  Role.BRANCH_AGENT, Role.FRANCHISE_MANAGER, Role.FRANCHISE_STAFF,
  Role.FRANCHISE_AGENT,
];

for (const role of exportAllowed) {
  test(`${role}: export ALLOWED`, () => {
    const perms = ROLE_PERMISSIONS[role];
    expect(perms.includes(Permission.MEMBER_EXPORT as any), `${role} should have MEMBER_EXPORT`);
  });
}

for (const role of exportDenied) {
  test(`${role}: export DENIED`, () => {
    const perms = ROLE_PERMISSIONS[role];
    expect(!perms.includes(Permission.MEMBER_EXPORT as any), `${role} must NOT have MEMBER_EXPORT`);
  });
}

// ─── Tests: Unblock Permissions ──────────────────────────────

console.log('\n📋 MEMBER UNBLOCK TESTS');

const unblockAllowed = [Role.SUPER_ADMIN, Role.ADMIN];
const unblockDenied = [
  Role.HQ_SERVICE_TEAM, Role.BRANCH_MANAGER, Role.BRANCH_STAFF,
  Role.BRANCH_AGENT, Role.FRANCHISE_MANAGER, Role.FRANCHISE_STAFF,
  Role.FRANCHISE_AGENT,
];

for (const role of unblockAllowed) {
  test(`${role}: unblock ALLOWED`, () => {
    const perms = ROLE_PERMISSIONS[role];
    expect(perms.includes(Permission.MEMBER_UNBLOCK as any), `${role} should have MEMBER_UNBLOCK`);
  });
}

for (const role of unblockDenied) {
  test(`${role}: unblock DENIED`, () => {
    const perms = ROLE_PERMISSIONS[role];
    expect(!perms.includes(Permission.MEMBER_UNBLOCK as any), `${role} must NOT have MEMBER_UNBLOCK`);
  });
}

// ─── Tests: Staff Management ─────────────────────────────────

console.log('\n📋 STAFF MANAGEMENT TESTS');

test('SUPER_ADMIN: staff create ALLOWED', () => {
  const perms = ROLE_PERMISSIONS[Role.SUPER_ADMIN];
  expect(perms.includes(Permission.STAFF_CREATE as any), 'SUPER_ADMIN must have STAFF_CREATE');
});

test('ADMIN: staff create ALLOWED', () => {
  const perms = ROLE_PERMISSIONS[Role.ADMIN];
  expect(perms.includes(Permission.STAFF_CREATE as any), 'ADMIN must have STAFF_CREATE');
});

test('BRANCH_MANAGER: staff create DENIED', () => {
  const perms = ROLE_PERMISSIONS[Role.BRANCH_MANAGER];
  expect(!perms.includes(Permission.STAFF_CREATE as any), 'BRANCH_MANAGER must NOT have STAFF_CREATE');
});

test('FRANCHISE_MANAGER: staff create ALLOWED', () => {
  const perms = ROLE_PERMISSIONS[Role.FRANCHISE_MANAGER];
  expect(perms.includes(Permission.STAFF_CREATE as any), 'FRANCHISE_MANAGER must have STAFF_CREATE');
});

test('FRANCHISE_MANAGER: manage own franchise staff ALLOWED', () => {
  const result = mockFranchiseStaffScope(Role.FRANCHISE_MANAGER, 'org-franchise-a', 'org-franchise-a');
  expect(result, 'Should allow franchise manager to manage own franchise staff');
});

test('FRANCHISE_MANAGER: manage other franchise staff DENIED', () => {
  let threw = false;
  try {
    mockFranchiseStaffScope(Role.FRANCHISE_MANAGER, 'org-franchise-a', 'org-franchise-b');
  } catch {
    threw = true;
  }
  expect(threw, 'Should throw when Franchise Manager tries to manage another franchise staff');
});

test('BRANCH_MANAGER: manage staff DENIED (no STAFF_BLOCK permission)', () => {
  const perms = ROLE_PERMISSIONS[Role.BRANCH_MANAGER];
  expect(!perms.includes(Permission.STAFF_BLOCK as any), 'BRANCH_MANAGER must not have STAFF_BLOCK');
});

// ─── Tests: Cross-Branch Access ──────────────────────────────

console.log('\n📋 CROSS-BRANCH ACCESS TESTS');

test('Branch A Manager: Branch A profile ALLOWED', () => {
  const result = mockScopeCheck(Role.BRANCH_MANAGER, 'org-branch-a', 'org-branch-a', 'BRANCH');
  expect(result, 'Branch A manager should access Branch A profile');
});

test('Branch A Manager: Branch B profile DENIED', () => {
  let threw = false;
  try {
    mockScopeCheck(Role.BRANCH_MANAGER, 'org-branch-a', 'org-branch-b', 'BRANCH');
  } catch {
    threw = true;
  }
  expect(threw, 'Branch A manager must not access Branch B profile');
});

test('Branch A Staff: Branch A profile ALLOWED', () => {
  const result = mockScopeCheck(Role.BRANCH_STAFF, 'org-branch-a', 'org-branch-a', 'BRANCH');
  expect(result, 'Branch A staff should access Branch A profile');
});

test('Branch A Staff: Branch B profile DENIED', () => {
  let threw = false;
  try {
    mockScopeCheck(Role.BRANCH_STAFF, 'org-branch-a', 'org-branch-b', 'BRANCH');
  } catch {
    threw = true;
  }
  expect(threw, 'Branch A staff must not access Branch B profile');
});

// ─── Tests: Agent Profile Ownership ──────────────────────────

console.log('\n📋 AGENT PROFILE OWNERSHIP TESTS');

test('Agent A: own created profile ALLOWED', () => {
  const result = mockScopeCheck(
    Role.BRANCH_AGENT, 'org-branch-a', 'org-branch-a', 'BRANCH', 'agent-a-id', 'agent-a-id'
  );
  expect(result, 'Agent should access own created profile');
});

test('Agent A: other agent profile DENIED', () => {
  let threw = false;
  try {
    mockScopeCheck(
      Role.BRANCH_AGENT, 'org-branch-a', 'org-branch-a', 'BRANCH', 'agent-b-id', 'agent-a-id'
    );
  } catch {
    threw = true;
  }
  expect(threw, 'Agent must not access profiles created by other agents');
});

// ─── Tests: HQ Service Team ──────────────────────────────────

console.log('\n📋 HQ SERVICE TEAM TESTS');

test('HQ_SERVICE_TEAM: access paid profiles ALLOWED', () => {
  const result = mockScopeCheck(Role.HQ_SERVICE_TEAM, 'org-hq', 'org-branch-a', 'HQ');
  expect(result, 'HQ Service Team should access paid profiles (HQ-owned)');
});

test('HQ_SERVICE_TEAM: no export permission', () => {
  const perms = ROLE_PERMISSIONS[Role.HQ_SERVICE_TEAM];
  expect(!perms.includes(Permission.MEMBER_EXPORT as any), 'HQ_SERVICE_TEAM must NOT have MEMBER_EXPORT');
});

test('HQ_SERVICE_TEAM: has ticket close permission', () => {
  const perms = ROLE_PERMISSIONS[Role.HQ_SERVICE_TEAM];
  expect(perms.includes(Permission.TICKET_CLOSE as any), 'HQ_SERVICE_TEAM must have TICKET_CLOSE');
});

// ─── Tests: Paid Profile Ownership ───────────────────────────

console.log('\n📋 PAID PROFILE OWNERSHIP TRANSFER TESTS');

test('Branch Manager: access HQ-owned (paid) profile DENIED', () => {
  let threw = false;
  try {
    mockScopeCheck(Role.BRANCH_MANAGER, 'org-branch-a', 'org-branch-a', 'HQ');
  } catch {
    threw = true;
  }
  expect(threw, 'Branch Manager must not access HQ-owned profiles after transfer');
});

test('SUPER_ADMIN: access HQ-owned profile ALLOWED', () => {
  const result = mockScopeCheck(Role.SUPER_ADMIN, null, 'org-branch-a', 'HQ');
  expect(result, 'SUPER_ADMIN should access HQ-owned profiles');
});

// ─── Tests: Invoice Permissions ──────────────────────────────

console.log('\n📋 INVOICE TESTS');

test('BRANCH_MANAGER: can raise invoice', () => {
  const perms = ROLE_PERMISSIONS[Role.BRANCH_MANAGER];
  expect(perms.includes(Permission.INVOICE_RAISE as any), 'BRANCH_MANAGER must have INVOICE_RAISE');
});

test('BRANCH_MANAGER: cannot approve invoice', () => {
  const perms = ROLE_PERMISSIONS[Role.BRANCH_MANAGER];
  expect(!perms.includes(Permission.INVOICE_APPROVE as any), 'BRANCH_MANAGER must NOT have INVOICE_APPROVE');
});

test('FRANCHISE_MANAGER: can approve invoice', () => {
  const perms = ROLE_PERMISSIONS[Role.FRANCHISE_MANAGER];
  expect(perms.includes(Permission.INVOICE_APPROVE as any), 'FRANCHISE_MANAGER must have INVOICE_APPROVE');
});

test('ADMIN: can approve invoice', () => {
  const perms = ROLE_PERMISSIONS[Role.ADMIN];
  expect(perms.includes(Permission.INVOICE_APPROVE as any), 'ADMIN must have INVOICE_APPROVE');
});

// ─── Summary ─────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log('🎉 All RBAC tests passed!\n');
} else {
  console.log('⚠️  Some tests failed. Review output above.\n');
  process.exit(1);
}

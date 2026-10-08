/**
 * Seed Script for Development/Testing
 * Creates all 9 staff roles + test members for RBAC testing.
 * DO NOT run in production.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Organizations ────────────────────────────────────────
  const hq = await prisma.organization.upsert({
    where: { id: 'org-hq' },
    update: {},
    create: { id: 'org-hq', name: 'HQ', type: 'HQ' },
  });

  const branchA = await prisma.organization.upsert({
    where: { id: 'org-branch-a' },
    update: {},
    create: { id: 'org-branch-a', name: 'Branch A', type: 'BRANCH' },
  });

  const branchB = await prisma.organization.upsert({
    where: { id: 'org-branch-b' },
    update: {},
    create: { id: 'org-branch-b', name: 'Branch B', type: 'BRANCH' },
  });

  const franchiseA = await prisma.organization.upsert({
    where: { id: 'org-franchise-a' },
    update: {},
    create: { id: 'org-franchise-a', name: 'Franchise A', type: 'FRANCHISE' },
  });

  console.log('✅ Organizations created');

  // ─── Staff Users ──────────────────────────────────────────
  const users = [
    // HQ
    { id: 'user-super-admin', mobile: '9000000001', role: 'SUPER_ADMIN', orgId: hq.id, division: 'NOT_APPLICABLE' },
    { id: 'user-admin', mobile: '9000000002', role: 'ADMIN', orgId: hq.id, division: 'NOT_APPLICABLE' },
    { id: 'user-hq-service', mobile: '9000000003', role: 'HQ_SERVICE_TEAM', orgId: hq.id, division: 'HQ_SERVICE_TEAM' },

    // Branch A
    { id: 'user-branch-a-manager', mobile: '9000000004', role: 'BRANCH_MANAGER', orgId: branchA.id, division: 'FREE_TEAM' },
    { id: 'user-branch-a-staff', mobile: '9000000005', role: 'BRANCH_STAFF', orgId: branchA.id, division: 'FREE_TEAM' },
    { id: 'user-branch-a-agent', mobile: '9000000006', role: 'BRANCH_AGENT', orgId: branchA.id, division: 'FREE_TEAM' },

    // Branch B
    { id: 'user-branch-b-manager', mobile: '9000000007', role: 'BRANCH_MANAGER', orgId: branchB.id, division: 'FREE_TEAM' },

    // Franchise A
    { id: 'user-franchise-a-manager', mobile: '9000000008', role: 'FRANCHISE_MANAGER', orgId: franchiseA.id, division: 'NOT_APPLICABLE' },
    { id: 'user-franchise-a-staff', mobile: '9000000009', role: 'FRANCHISE_STAFF', orgId: franchiseA.id, division: 'FREE_TEAM' },
    { id: 'user-franchise-a-agent', mobile: '9000000010', role: 'FRANCHISE_AGENT', orgId: franchiseA.id, division: 'FREE_TEAM' },

    // Special status staff
    { id: 'user-suspended', mobile: '9000000011', role: 'BRANCH_STAFF', orgId: branchA.id, division: 'FREE_TEAM', status: 'SUSPENDED' },
    { id: 'user-blocked', mobile: '9000000012', role: 'BRANCH_STAFF', orgId: branchA.id, division: 'FREE_TEAM', status: 'BLOCKED' },
    { id: 'user-terminated', mobile: '9000000013', role: 'BRANCH_STAFF', orgId: branchA.id, division: 'FREE_TEAM', status: 'TERMINATED' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        mobile: u.mobile,
        passwordHash: await hash('Test@1234'),
        role: u.role as any,
        status: (u.status || 'ACTIVE') as any,
        staffDivision: u.division as any,
        organizationId: u.orgId,
      },
    });
  }

  console.log('✅ Staff users created');

  // ─── Member users ─────────────────────────────────────────
  // Free Member (Branch A)
  const freeMember = await prisma.user.upsert({
    where: { id: 'user-member-free' },
    update: {},
    create: {
      id: 'user-member-free',
      mobile: '9000000020',
      passwordHash: await hash('Test@1234'),
      role: 'MEMBER',
      organizationId: branchA.id,
    },
  });

  await prisma.memberProfile.upsert({
    where: { id: 'profile-free' },
    update: {},
    create: {
      id: 'profile-free',
      userId: freeMember.id,
      firstName: 'Free',
      lastName: 'Member',
      gender: 'Male',
      dateOfBirth: new Date('1990-01-01'),
      packageType: 'FREE',
      ownershipType: 'BRANCH',
      ownerOrgId: branchA.id,
      originatingOrgId: branchA.id,
      createdByStaffId: 'user-branch-a-agent',
    },
  });

  // Paid Member (HQ-owned)
  const paidMember = await prisma.user.upsert({
    where: { id: 'user-member-paid' },
    update: {},
    create: {
      id: 'user-member-paid',
      mobile: '9000000021',
      passwordHash: await hash('Test@1234'),
      role: 'MEMBER',
      organizationId: hq.id,
    },
  });

  await prisma.memberProfile.upsert({
    where: { id: 'profile-paid' },
    update: {},
    create: {
      id: 'profile-paid',
      userId: paidMember.id,
      firstName: 'Paid',
      lastName: 'Member',
      gender: 'Female',
      dateOfBirth: new Date('1992-05-15'),
      packageType: 'PAID',
      ownershipType: 'HQ',
      ownerOrgId: null,
      originatingOrgId: branchA.id,
      createdByStaffId: 'user-branch-a-agent',
    },
  });

  // Branch B member (different branch)
  const branchBMember = await prisma.user.upsert({
    where: { id: 'user-member-branch-b' },
    update: {},
    create: {
      id: 'user-member-branch-b',
      mobile: '9000000022',
      passwordHash: await hash('Test@1234'),
      role: 'MEMBER',
      organizationId: branchB.id,
    },
  });

  await prisma.memberProfile.upsert({
    where: { id: 'profile-branch-b' },
    update: {},
    create: {
      id: 'profile-branch-b',
      userId: branchBMember.id,
      firstName: 'BranchB',
      lastName: 'Member',
      gender: 'Male',
      dateOfBirth: new Date('1988-03-20'),
      packageType: 'FREE',
      ownershipType: 'BRANCH',
      ownerOrgId: branchB.id,
      originatingOrgId: branchB.id,
      createdByStaffId: 'user-branch-b-manager',
    },
  });

  // Agent B member (created by franchise agent, for cross-agent ownership test)
  const agentBMember = await prisma.user.upsert({
    where: { id: 'user-member-agent-b' },
    update: {},
    create: {
      id: 'user-member-agent-b',
      mobile: '9000000023',
      passwordHash: await hash('Test@1234'),
      role: 'MEMBER',
      organizationId: franchiseA.id,
    },
  });

  await prisma.memberProfile.upsert({
    where: { id: 'profile-agent-b' },
    update: {},
    create: {
      id: 'profile-agent-b',
      userId: agentBMember.id,
      firstName: 'AgentB',
      lastName: 'Member',
      gender: 'Female',
      dateOfBirth: new Date('1995-07-10'),
      packageType: 'FREE',
      ownershipType: 'FRANCHISE',
      ownerOrgId: franchiseA.id,
      originatingOrgId: franchiseA.id,
      createdByStaffId: 'user-franchise-a-staff', // created by staff, NOT franchise agent
    },
  });

  console.log('✅ Member profiles created');

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials (password: Test@1234):');
  console.log('  Super Admin:       9000000001');
  console.log('  Admin:             9000000002');
  console.log('  HQ Service Team:   9000000003');
  console.log('  Branch A Manager:  9000000004');
  console.log('  Branch A Staff:    9000000005');
  console.log('  Branch A Agent:    9000000006');
  console.log('  Branch B Manager:  9000000007');
  console.log('  Franchise A Mgr:   9000000008');
  console.log('  Franchise A Staff: 9000000009');
  console.log('  Franchise A Agent: 9000000010');
  console.log('  Suspended Staff:   9000000011');
  console.log('  Blocked Staff:     9000000012 (login DENIED)');
  console.log('  Terminated Staff:  9000000013 (login DENIED)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

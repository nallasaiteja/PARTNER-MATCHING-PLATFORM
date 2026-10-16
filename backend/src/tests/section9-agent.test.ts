import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AgentService } from '../agent/agent.service';
import { InvoicesService } from '../finance/invoices.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const agentService = new AgentService(prisma, auditService);
const invoicesService = new InvoicesService(prisma, auditService);

async function runSection9Tests() {
  console.log('🧪 Starting SECTION 9 — AGENT PORTAL INTEGRATION TEST SUITE\n');

  // 1. Setup Test Users & Orgs
  let branchA = await prisma.organization.findUnique({ where: { id: 'org-branch-a' } });
  if (!branchA) {
    branchA = await prisma.organization.create({
      data: { id: 'org-branch-a', name: 'Branch A', type: 'BRANCH' },
    });
  }

  let franchiseA = await prisma.organization.findUnique({ where: { id: 'org-franchise-a' } });
  if (!franchiseA) {
    franchiseA = await prisma.organization.create({
      data: { id: 'org-franchise-a', name: 'Franchise A', type: 'FRANCHISE' },
    });
  }

  // Branch Agent 1
  let branchAgent1 = await prisma.user.findFirst({
    where: { role: Role.BRANCH_AGENT, organizationId: branchA.id },
  });
  if (!branchAgent1) {
    branchAgent1 = await prisma.user.create({
      data: {
        id: 'user-branch-agent-1-test',
        mobile: '9111000001',
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.BRANCH_AGENT,
        organizationId: branchA.id,
      },
    });
  }

  // Branch Agent 2 (different agent in Branch A for privacy testing)
  let branchAgent2 = await prisma.user.findUnique({ where: { id: 'user-branch-agent-2-test' } });
  if (!branchAgent2) {
    branchAgent2 = await prisma.user.create({
      data: {
        id: 'user-branch-agent-2-test',
        mobile: '9111000002',
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.BRANCH_AGENT,
        organizationId: branchA.id,
      },
    });
  }

  // Franchise Agent
  let franchiseAgent = await prisma.user.findFirst({
    where: { role: Role.FRANCHISE_AGENT, organizationId: franchiseA.id },
  });
  if (!franchiseAgent) {
    franchiseAgent = await prisma.user.create({
      data: {
        id: 'user-franchise-agent-test',
        mobile: '9111000003',
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.FRANCHISE_AGENT,
        organizationId: franchiseA.id,
      },
    });
  }

  // Super Admin
  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  assert.ok(superAdmin, 'Super Admin must exist');

  // Franchise Manager
  let franchiseManager = await prisma.user.findFirst({
    where: { role: Role.FRANCHISE_MANAGER, organizationId: franchiseA.id },
  });
  if (!franchiseManager) {
    franchiseManager = await prisma.user.create({
      data: {
        id: 'user-franchise-manager-test',
        mobile: '9111000004',
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.FRANCHISE_MANAGER,
        organizationId: franchiseA.id,
      },
    });
  }

  // Packages
  const silverPkg = await prisma.packageMaster.findFirst({ where: { name: 'Silver' } });
  assert.ok(silverPkg, 'Silver package must exist');

  console.log('✅ Setup verified:');
  console.log(`   - Branch Agent 1: ${branchAgent1.id} (${branchA.name})`);
  console.log(`   - Branch Agent 2: ${branchAgent2.id} (${branchA.name})`);
  console.log(`   - Franchise Agent: ${franchiseAgent.id} (${franchiseA.name})`);
  console.log(`   - Super Admin: ${superAdmin.id}`);
  console.log(`   - Franchise Manager: ${franchiseManager.id}\n`);

  // ==========================================================================
  // SCENARIO 1: Branch Agent can create a member profile and see it in their own list
  // ==========================================================================
  console.log('📝 Scenario 1: Branch Agent Profile Creation & Own Profile List');
  const uniqueMobile = '988' + Math.floor(1000000 + Math.random() * 9000000);
  const createdRes = await agentService.createMemberProfile(
    branchAgent1,
    {
      firstName: 'Ramesh',
      lastName: 'Goud',
      gender: 'Male',
      dateOfBirth: '1996-04-12',
      mobile: uniqueMobile,
      caste: 'Goud',
      religion: 'Hindu',
      maritalStatus: 'Unmarried',
    },
    '127.0.0.1',
  );

  const profileA = createdRes.profile;
  assert.ok(profileA.id, 'Created profile must have an ID');
  assert.equal(profileA.createdByStaffId, branchAgent1.id, 'Creator ID must match Branch Agent 1');
  assert.equal(profileA.ownerOrgId, branchA.id, 'Branch ID must match Branch Agent 1 organization');
  assert.equal(profileA.ownershipType, 'BRANCH', 'Ownership type must be BRANCH');
  console.log(`  ✅ PASS: Profile created with ID ${profileA.memberId} by Agent 1`);

  // Agent 1 lists their own profiles
  const agent1Profiles = await agentService.listOwnProfiles(branchAgent1, {});
  const foundInOwnList = agent1Profiles.data.some((p) => p.id === profileA.id);
  assert.ok(foundInOwnList, 'Created profile must be in Agent 1 profile list');
  console.log('  ✅ PASS: Profile appears in Agent 1 profile list');

  // ==========================================================================
  // SCENARIO 2: Second Branch Agent cannot view or edit that profile (Data Privacy)
  // ==========================================================================
  console.log('\n🔒 Scenario 2: Cross-Agent Profile Privacy (Same Branch Isolation)');
  const agent2Profiles = await agentService.listOwnProfiles(branchAgent2, {});
  const foundInAgent2List = agent2Profiles.data.some((p) => p.id === profileA.id);
  assert.ok(!foundInAgent2List, 'Agent 2 must NEVER see Agent 1 created profile in list');
  console.log('  ✅ PASS: Agent 2 profile list excludes Agent 1 profiles');

  // Direct ID read attempt by Agent 2
  let readDenied = false;
  try {
    await agentService.getOwnProfile(branchAgent2, profileA.id);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Access denied')) {
      readDenied = true;
    }
  }
  assert.ok(readDenied, 'Direct read by another agent must be rejected with 403 Forbidden');
  console.log('  ✅ PASS: Direct profile read by Agent 2 denied with 403 Forbidden');

  // Direct edit attempt by Agent 2
  let editDenied = false;
  try {
    await agentService.updateOwnProfile(branchAgent2, profileA.id, {
      currentStep: 2,
    });
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Access denied')) {
      editDenied = true;
    }
  }
  assert.ok(editDenied, 'Direct edit by another agent must be rejected with 403 Forbidden');
  console.log('  ✅ PASS: Direct profile edit by Agent 2 denied with 403 Forbidden');

  // ==========================================================================
  // SCENARIO 3: Franchise Agent cannot view another agent's profile
  // ==========================================================================
  console.log('\n🔒 Scenario 3: Franchise Agent Privacy Enforcement');
  let franchiseAgentDenied = false;
  try {
    await agentService.getOwnProfile(franchiseAgent, profileA.id);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Access denied')) {
      franchiseAgentDenied = true;
    }
  }
  assert.ok(franchiseAgentDenied, 'Franchise Agent read of Branch Agent profile must be rejected with 403');
  console.log('  ✅ PASS: Franchise Agent cross-access denied with 403 Forbidden');

  // Franchise Agent creates own profile
  const franchiseMobile = '977' + Math.floor(1000000 + Math.random() * 9000000);
  const franchiseProfileRes = await agentService.createMemberProfile(franchiseAgent, {
    firstName: 'Sneha',
    lastName: 'Reddy',
    gender: 'Female',
    dateOfBirth: '1998-08-20',
    mobile: franchiseMobile,
    caste: 'Reddy',
    religion: 'Hindu',
  });
  const franchiseProfile = franchiseProfileRes.profile;
  assert.equal(franchiseProfile.createdByStaffId, franchiseAgent.id);
  assert.equal(franchiseProfile.ownershipType, 'FRANCHISE');
  console.log(`  ✅ PASS: Franchise Agent created profile with ID ${franchiseProfile.memberId}`);

  // Branch Agent 1 cannot read Franchise Agent's profile
  let branchAgentReadDenied = false;
  try {
    await agentService.getOwnProfile(branchAgent1, franchiseProfile.id);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Access denied')) {
      branchAgentReadDenied = true;
    }
  }
  assert.ok(branchAgentReadDenied, 'Branch Agent cannot read Franchise Agent profile');
  console.log('  ✅ PASS: Branch Agent read of Franchise Agent profile denied with 403 Forbidden');

  // ==========================================================================
  // SCENARIO 4: Agents cannot delete member profiles (Permanent Records)
  // ==========================================================================
  console.log('\n🚫 Scenario 4: Delete Denial on Member Profiles');
  let deleteDenied = false;
  try {
    await agentService.deleteProfile(branchAgent1, profileA.id);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('delete')) {
      deleteDenied = true;
    }
  }
  assert.ok(deleteDenied, 'Delete profile must be rejected with 403 Forbidden');
  console.log('  ✅ PASS: Delete profile attempt denied with 403 Forbidden');

  // ==========================================================================
  // SCENARIO 5: Immutable field preservation on Agent Profile Edit
  // ==========================================================================
  console.log('\n🛡️ Scenario 5: Immutable Field Validation');
  let immutableDenied = false;
  try {
    await agentService.updateOwnProfile(branchAgent1, profileA.id, {
      firstName: 'DifferentName',
    });
  } catch (err: any) {
    if (err.status === 400 || err.message?.includes('immutable')) {
      immutableDenied = true;
    }
  }
  assert.ok(immutableDenied, 'Modifying firstName must trigger immutable field BadRequestException');
  console.log('  ✅ PASS: Attempt to alter immutable name rejected with 400 BadRequestException');

  // Allowed update (photoUrl or currentStep)
  const allowedUpdate = await agentService.updateOwnProfile(branchAgent1, profileA.id, {
    photoUrl: 'https://example.com/photos/profile-ramesh.jpg',
    currentStep: 2,
  });
  assert.equal(allowedUpdate.profile.currentStep, 2);
  assert.equal(allowedUpdate.profile.photoUrl, 'https://example.com/photos/profile-ramesh.jpg');
  console.log('  ✅ PASS: Permitted fields (photoUrl, currentStep) updated successfully');

  // ==========================================================================
  // SCENARIO 6: Branch Agent raises invoice request -> Routes to HQ Admin
  // ==========================================================================
  console.log('\n🧾 Scenario 6: Branch Agent Invoice Request Routing (Directly to HQ)');
  const branchInvoiceRes = await agentService.raiseInvoiceRequest(
    branchAgent1,
    {
      memberProfileId: profileA.id,
      packageId: silverPkg.id,
      paymentMode: 'ONLINE',
      transactionRef: 'UTR-BRANCH-AGT-001',
      bankName: 'HDFC Bank',
      notes: 'Customer transferred via NEFT',
    },
    '127.0.0.1',
  );

  const branchInvoice = branchInvoiceRes.invoice;
  assert.ok(branchInvoice.id, 'Invoice request must be created');
  assert.equal(branchInvoice.status, 'PENDING', 'Initial status must be PENDING');
  assert.equal(branchInvoice.amount, silverPkg.cost, 'Amount must be trusted DB package cost');
  assert.equal(branchInvoice.raisedById, branchAgent1.id, 'raisedById must be authenticated agent');
  assert.ok(branchInvoice.notes?.includes('HQ'), 'Notes must indicate routing to HQ Admin');
  console.log(`  ✅ PASS: Branch Agent raised invoice ${branchInvoice.requestNumber} (Routed to HQ)`);

  // ==========================================================================
  // SCENARIO 7: Franchise Agent raises invoice request -> Routes to Franchise Manager
  // ==========================================================================
  console.log('\n🧾 Scenario 7: Franchise Agent Invoice Request Routing (To Franchise Manager)');
  const franchiseInvoiceRes = await agentService.raiseInvoiceRequest(
    franchiseAgent,
    {
      memberProfileId: franchiseProfile.id,
      packageId: silverPkg.id,
      paymentMode: 'ONLINE',
      transactionRef: 'UTR-FRANCHISE-AGT-001',
      bankName: 'SBI Bank',
      notes: 'Franchise client online payment',
    },
    '127.0.0.1',
  );

  const franchiseInvoice = franchiseInvoiceRes.invoice;
  assert.ok(franchiseInvoice.id);
  assert.equal(franchiseInvoice.status, 'PENDING');
  assert.equal(franchiseInvoice.raisedById, franchiseAgent.id);
  assert.ok(
    franchiseInvoice.notes?.includes('Franchise Manager'),
    'Notes must indicate routing to Franchise Manager',
  );
  console.log(`  ✅ PASS: Franchise Agent raised invoice ${franchiseInvoice.requestNumber} (Routed to Franchise Manager)`);

  // ==========================================================================
  // SCENARIO 8: Agents cannot approve invoice requests or directly mark as Paid
  // ==========================================================================
  console.log('\n🚫 Scenario 8: Self-Approval Denial for Agents');
  let agentApproveDenied = false;
  try {
    await agentService.approveInvoice(branchAgent1, branchInvoice.id);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('approve')) {
      agentApproveDenied = true;
    }
  }
  assert.ok(agentApproveDenied, 'Branch Agent approving invoice must be rejected with 403');
  console.log('  ✅ PASS: Agent self-approval attempt rejected with 403 Forbidden');

  // Verify status is still PENDING
  const checkInv = await prisma.memberInvoice.findUnique({ where: { id: branchInvoice.id } });
  assert.equal(checkInv?.status, 'PENDING', 'Invoice must remain in PENDING status');
  console.log('  ✅ PASS: Invoice remains in PENDING status');

  // ==========================================================================
  // SCENARIO 9: Branch Agent commissions & No Independent Wallet rule
  // ==========================================================================
  console.log('\n💰 Scenario 9: Commission View & No Independent Wallet Policy');
  const commView = await agentService.getCommissionView(branchAgent1);
  assert.equal(commView.summary.hasIndependentWallet, false, 'Branch Agent must have NO independent wallet');
  assert.equal(commView.summary.settlementModel, 'OFFLINE_MANUAL', 'Settlement model must be OFFLINE_MANUAL');
  console.log('  ✅ PASS: Commission view confirms No Independent Wallet and Offline Settlement');

  // Attempt to configure commission by agent
  let configDenied = false;
  try {
    await agentService.configureCommission(branchAgent1);
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('configure')) {
      configDenied = true;
    }
  }
  assert.ok(configDenied, 'Agent configuring commission must be rejected with 403 Forbidden');
  console.log('  ✅ PASS: Agent attempt to configure commission denied with 403 Forbidden');

  // ==========================================================================
  // SCENARIO 10: Franchise Manager approval and wallet deduction integration
  // ==========================================================================
  console.log('\n💼 Scenario 10: Franchise Manager Approval & Wallet Deduction Integration');
  // Initialize wallet for Franchise A if not existing
  let wallet = await prisma.franchiseWallet.findUnique({ where: { franchiseOrgId: franchiseA.id } });
  if (!wallet) {
    wallet = await prisma.franchiseWallet.create({
      data: { franchiseOrgId: franchiseA.id, balance: 50000, creditLimit: 10000 },
    });
  } else if (wallet.balance < silverPkg.cost) {
    wallet = await prisma.franchiseWallet.update({
      where: { id: wallet.id },
      data: { balance: 50000 },
    });
  }

  // Franchise Manager approves the request raised by Franchise Agent
  const initialBalance = wallet.balance;
  const approvedRes = await invoicesService.approveInvoice(
    franchiseManager,
    franchiseInvoice.id,
    { notes: 'Approved by Franchise Manager' },
  );

  assert.equal(approvedRes.invoice.status, 'APPROVED', 'Invoice must be APPROVED');
  assert.ok(approvedRes.invoice.invoiceNumber, 'Must generate finalized invoiceNumber');

  // Verify wallet deducted
  const walletAfter = await prisma.franchiseWallet.findUnique({ where: { id: wallet.id } });
  assert.equal(walletAfter?.balance, initialBalance - silverPkg.cost, 'Wallet must be deducted exactly by package price');
  console.log(`  ✅ PASS: Franchise Manager approved request. Wallet deducted from ₹${initialBalance} to ₹${walletAfter?.balance}`);

  // Member package activated
  const updatedMember = await prisma.memberProfile.findUnique({ where: { id: franchiseProfile.id } });
  assert.equal(updatedMember?.packageType, 'PAID', 'Member packageType must become PAID upon approval');
  console.log('  ✅ PASS: Member profile packageType updated to PAID');

  // ==========================================================================
  // SCENARIO 11: Agent Dashboard Aggregations from authorized DB records
  // ==========================================================================
  console.log('\n📊 Scenario 11: Agent Dashboard Aggregations (Live Authorized DB Counts)');
  const dash = await agentService.getDashboard(branchAgent1);
  assert.ok(dash.stats.totalProfilesCreated >= 1, 'Total profiles created count must reflect real DB data');
  assert.ok(dash.stats.pendingInvoices >= 1, 'Pending invoices count must reflect real DB data');
  assert.equal(dash.commissions.hasIndependentWallet, false);
  console.log(`  ✅ PASS: Dashboard aggregates verified (Profiles: ${dash.stats.totalProfilesCreated}, Pending Invoices: ${dash.stats.pendingInvoices})`);

  console.log('\n🎉 ALL 11 SECTION 9 AGENT PORTAL INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runSection9Tests()
  .catch((err) => {
    console.error('❌ Section 9 Tests Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

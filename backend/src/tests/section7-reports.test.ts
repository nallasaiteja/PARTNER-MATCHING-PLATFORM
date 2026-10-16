import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReportsService } from '../reports/reports.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const reportsService = new ReportsService(prisma, auditService);

async function runSection7Tests() {
  console.log('🧪 Starting SECTION 7 — REPORTS & ANALYTICS TEST SUITE\n');

  // Setup / verify existing test users & orgs
  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const branchManager = await prisma.user.findFirst({ where: { role: Role.BRANCH_MANAGER } });
  const branchStaff = await prisma.user.findFirst({ where: { role: Role.BRANCH_STAFF } });
  const franchiseManager = await prisma.user.findFirst({ where: { role: Role.FRANCHISE_MANAGER } });
  const member = await prisma.user.findFirst({ where: { role: Role.MEMBER } });

  assert.ok(superAdmin, 'Super Admin must exist');
  assert.ok(admin, 'Admin must exist');
  assert.ok(branchStaff, 'Branch Staff must exist');
  assert.ok(member, 'Member must exist');

  const branchOrg = await prisma.organization.findFirst({ where: { type: 'BRANCH' } });
  const franchiseOrg = await prisma.organization.findFirst({ where: { type: 'FRANCHISE' } });

  console.log('✅ Setup verified:');
  console.log(`   - Super Admin: ${superAdmin.employeeId || superAdmin.id}`);
  console.log(`   - Admin: ${admin.employeeId || admin.id}`);
  console.log(`   - Branch Org: ${branchOrg?.name} (${branchOrg?.id})`);
  console.log(`   - Franchise Org: ${franchiseOrg?.name} (${franchiseOrg?.id})`);

  // --------------------------------------------------------------------------
  // SCENARIO 1: RBAC Access Control & Authorization (Super Admin / Admin Only)
  // --------------------------------------------------------------------------
  console.log('\n🔒 Scenario 1: RBAC Access Control - Only Super Admin and Admin can access');

  // Super Admin: Allowed
  const saRes = await reportsService.getUnverifiedIdProofs(superAdmin, {});
  assert.ok(saRes, 'Super Admin must access reports');
  console.log(`  ✅ PASS: Super Admin accessed report (${saRes.totalCount} unverified IDs)`);

  // Admin: Allowed
  const adminRes = await reportsService.getUnverifiedIdProofs(admin, {});
  assert.ok(adminRes, 'Admin must access reports');
  console.log('  ✅ PASS: Admin successfully accessed report');

  // Branch Manager: Forbidden
  try {
    await reportsService.getUnverifiedIdProofs(branchManager, {});
    assert.fail('Branch Manager should be rejected with 403 Forbidden');
  } catch (err: any) {
    assert.ok(err.status === 403 || err.message.includes('Access Denied'));
    console.log('  ✅ PASS: Branch Manager rejected with 403 Forbidden');
  }

  // Branch Staff: Forbidden
  try {
    await reportsService.getUnverifiedIdProofs(branchStaff, {});
    assert.fail('Branch Staff should be rejected with 403 Forbidden');
  } catch (err: any) {
    assert.ok(err.status === 403 || err.message.includes('Access Denied'));
    console.log('  ✅ PASS: Branch Staff rejected with 403 Forbidden');
  }

  // Member: Forbidden
  try {
    await reportsService.getUnverifiedIdProofs(member, {});
    assert.fail('Member should be rejected with 403 Forbidden');
  } catch (err: any) {
    assert.ok(err.status === 403 || err.message.includes('Access Denied'));
    console.log('  ✅ PASS: Member rejected with 403 Forbidden');
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: Member Data Reports — Unverified ID Proofs
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 2: Member Data Reports — Unverified ID Proofs');
  const unverifiedRes = await reportsService.getUnverifiedIdProofs(superAdmin, {});
  assert.ok(Array.isArray(unverifiedRes.records));
  console.log(`  ✅ PASS: Retrieved ${unverifiedRes.records.length} unverified ID records`);
  if (unverifiedRes.records.length > 0) {
    const first = unverifiedRes.records[0];
    assert.ok(first.memberId, 'Record must include memberId');
    assert.ok(first.idProofType, 'Record must include idProofType');
    assert.ok(first.uploadedBy, 'Record must include uploadedBy');
    assert.ok(first.profileId, 'Record must include profileId');
    console.log(`     Sample: ${first.memberId} - ${first.fullName} (${first.idProofType})`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 3: Member Data Reports — Profiles Without Photos
  // --------------------------------------------------------------------------
  console.log('\n📷 Scenario 3: Member Data Reports — Profiles Without Photos');
  const noPhotosRes = await reportsService.getProfilesWithoutPhotos(superAdmin, {});
  assert.ok(Array.isArray(noPhotosRes.records));
  console.log(`  ✅ PASS: Retrieved ${noPhotosRes.records.length} profiles without photos`);
  if (noPhotosRes.records.length > 0) {
    const first = noPhotosRes.records[0];
    assert.ok(first.memberId, 'Must have memberId');
    assert.ok(first.gender, 'Must have gender');
    assert.ok(first.packageType, 'Must have packageType');
    console.log(`     Sample: ${first.memberId} - ${first.fullName} (${first.packageType})`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 4: Member Data Reports — Profiles Below 30% Completion
  // --------------------------------------------------------------------------
  console.log('\n📉 Scenario 4: Member Data Reports — Profiles Below 30% Completion');
  const below30Res = await reportsService.getProfilesBelow30(superAdmin, {});
  assert.ok(Array.isArray(below30Res.records));
  console.log(`  ✅ PASS: Retrieved ${below30Res.records.length} profiles below 30% completion`);
  for (const rec of below30Res.records) {
    assert.ok(
      rec.completionPercentage < 30,
      `Record ${rec.memberId} completion (${rec.completionPercentage}%) must be < 30%`,
    );
  }

  // --------------------------------------------------------------------------
  // SCENARIO 5: Member Data Reports — Incomplete Profile Summary
  // --------------------------------------------------------------------------
  console.log('\n📑 Scenario 5: Member Data Reports — Incomplete Profile Summary & KPIs');
  const summaryRes = await reportsService.getIncompleteProfileSummary(superAdmin, { page: 1, limit: 10 });
  assert.ok(summaryRes.kpi, 'Must include KPI counters');
  assert.ok(summaryRes.kpi.totalMembers >= 0);
  assert.ok(summaryRes.pagination, 'Must include pagination metadata');
  assert.ok(Array.isArray(summaryRes.records));
  console.log(`  ✅ PASS: Total Members: ${summaryRes.kpi.totalMembers}, Below 30%: ${summaryRes.kpi.below30Count}`);
  if (summaryRes.records.length > 0) {
    const r = summaryRes.records[0];
    assert.ok(r.photoUploaded === 'Yes' || r.photoUploaded === 'No');
    assert.ok(r.idProofUploaded === 'Yes' || r.idProofUploaded === 'No');
    console.log(`     Sample: ${r.memberId} - Photo: ${r.photoUploaded}, ID: ${r.idProofUploaded}, Completion: ${r.completionPercentage}%`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 6: Sales & Revenue Reports — Branch Revenue
  // --------------------------------------------------------------------------
  console.log('\n🏢 Scenario 6: Sales & Revenue Reports — Branch Revenue');
  const branchRev = await reportsService.getBranchRevenueReport(superAdmin, { period: 'overall' });
  assert.ok(Array.isArray(branchRev.branches));
  assert.ok(branchRev.totals, 'Must compute summary totals');
  console.log(`  ✅ PASS: Evaluated ${branchRev.branches.length} branches. Total Revenue: ₹${branchRev.totals.totalRevenue}`);
  if (branchRev.branches.length > 0) {
    const b = branchRev.branches[0];
    assert.ok(b.branchName);
    assert.ok(typeof b.profilesCreated === 'number');
    assert.ok(typeof b.profilesPaid === 'number');
    assert.ok(typeof b.profilesApproved === 'number');
    console.log(`     Branch ${b.branchName}: Created=${b.profilesCreated}, Paid=${b.profilesPaid}, Approved=${b.profilesApproved}, Revenue=₹${b.totalRevenue}`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 7: Sales & Revenue Reports — Agent & Franchise Revenue
  // --------------------------------------------------------------------------
  console.log('\n👤 Scenario 7: Sales & Revenue Reports — Agent & Franchise Revenue');
  const agentRev = await reportsService.getAgentRevenueReport(superAdmin, {});
  assert.ok(Array.isArray(agentRev.agents));
  console.log(`  ✅ PASS: Evaluated ${agentRev.agents.length} agents. Total Commissions: ₹${agentRev.totals.totalCommission}`);

  const franchiseRev = await reportsService.getFranchiseRevenueReport(superAdmin, {});
  assert.ok(Array.isArray(franchiseRev.franchises));
  console.log(`  ✅ PASS: Evaluated ${franchiseRev.franchises.length} franchises with wallet balances`);

  // --------------------------------------------------------------------------
  // SCENARIO 8: Sales & Revenue Reports — Invoice Approvals, Ads, & Services
  // --------------------------------------------------------------------------
  console.log('\n🧾 Scenario 8: Sales & Revenue Reports — Invoices, Ads & Wedding Services');
  const invApprovals = await reportsService.getInvoiceApprovalReport(superAdmin, {});
  assert.ok(Array.isArray(invApprovals.invoices));
  console.log(`  ✅ PASS: Retrieved ${invApprovals.totalCount} approved invoices (₹${invApprovals.totalAmount})`);

  const adRev = await reportsService.getAdvertisementRevenueReport(superAdmin, {});
  assert.ok(Array.isArray(adRev.advertisements));
  console.log(`  ✅ PASS: Retrieved ${adRev.totalCount} advertisements (₹${adRev.totalFeesCollected})`);

  const weddingRev = await reportsService.getWeddingServicesRevenueReport(superAdmin, {});
  assert.ok(Array.isArray(weddingRev.services));
  console.log(`  ✅ PASS: Retrieved ${weddingRev.totalPartners} wedding service partners (₹${weddingRev.totalPartnershipFees})`);

  // --------------------------------------------------------------------------
  // SCENARIO 9: Staff Activity Reports — Real-Time Visits & Performance
  // --------------------------------------------------------------------------
  console.log('\n👥 Scenario 9: Staff Activity Reports — Profile Visits & Performance Metrics');
  const testMember = await prisma.memberProfile.findFirst();
  assert.ok(testMember, 'Member profile must exist');

  // Record a visit by branch staff
  await reportsService.recordStaffProfileVisit(branchStaff, testMember.id);

  const visitsRes = await reportsService.getStaffProfileVisits(superAdmin, {});
  assert.ok(Array.isArray(visitsRes.visits));
  assert.ok(visitsRes.visits.length > 0, 'Visits must contain recorded visit');
  console.log(`  ✅ PASS: Staff profile visits recorded & queried (${visitsRes.visits.length} visits logged)`);

  const staffCreated = await reportsService.getStaffProfilesCreated(superAdmin, {});
  assert.ok(Array.isArray(staffCreated.staff));
  console.log(`  ✅ PASS: Profiles created activity report generated for ${staffCreated.staff.length} staff members`);

  const staffPayments = await reportsService.getStaffPaymentsProcessed(superAdmin, {});
  assert.ok(Array.isArray(staffPayments.staff));
  console.log(`  ✅ PASS: Payments processed activity report generated`);

  const staffCash = await reportsService.getStaffCurrencyCollected(superAdmin, {});
  assert.ok(Array.isArray(staffCash.staff));
  console.log(`  ✅ PASS: Cash currency collected activity report generated`);

  // --------------------------------------------------------------------------
  // SCENARIO 10: Member Data Download Options, Biodata & Audit Logging
  // --------------------------------------------------------------------------
  console.log('\n💾 Scenario 10: Member Data Download Options, Biodata & Audit Logging');
  const downloadRes = await reportsService.downloadMemberData(
    superAdmin,
    { status: 'ALL' },
    '127.0.0.1',
  );
  assert.ok(downloadRes.csvContent, 'Must generate CSV content');
  assert.ok(downloadRes.csvContent.includes('Customer Name,Customer ID'));
  console.log(`  ✅ PASS: Generated Member Download Report with ${downloadRes.recordCount} records`);

  // Verify Audit Log entry for MEMBER_EXPORT
  const exportLog = await prisma.auditLog.findFirst({
    where: {
      action: 'MEMBER_EXPORT' as any,
      actorId: superAdmin.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(exportLog, 'Audit log must record MEMBER_EXPORT action');
  console.log(`  ✅ PASS: Audit log registered: action=${exportLog.action}, actor=${exportLog.actorId}`);

  // Test Individual Member Biodata Export
  const biodataRes = await reportsService.getMemberBiodata(superAdmin, testMember.memberId || testMember.id);
  assert.ok(biodataRes.biodata, 'Must generate individual biodata');
  assert.ok(biodataRes.csvContent.includes('Full Name'));
  console.log(`  ✅ PASS: Individual Biodata generated for ${biodataRes.biodata.fullName} (${biodataRes.biodata.memberId})`);

  // Test Photos Download List
  const photosRes = await reportsService.getPhotosDownloadList(superAdmin, { type: 'MEMBERS' });
  assert.ok(Array.isArray(photosRes.photos));
  console.log(`  ✅ PASS: Retrieved photo download list (${photosRes.photos.length} photos ready for external drive backup)`);

  console.log('\n🎉 ALL SECTION 7 REPORTS & ANALYTICS TEST SCENARIOS PASSED! 🚀\n');
}

runSection7Tests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

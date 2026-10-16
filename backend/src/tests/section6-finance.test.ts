import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoicesService } from '../finance/invoices.service';
import { WalletsService } from '../finance/wallets.service';
import { LedgersService } from '../finance/ledgers.service';
import { CommissionsService } from '../finance/commissions.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const invoicesService = new InvoicesService(prisma, auditService);
const walletsService = new WalletsService(prisma);
const ledgersService = new LedgersService(prisma);
const commissionsService = new CommissionsService(prisma);

async function runTests() {
  console.log('🧪 Starting SECTION 6 — Approvals, Invoices & Financial Flows Test Suite\n');

  // Setup / fetch test roles and orgs
  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const branchManager = await prisma.user.findFirst({ where: { role: Role.BRANCH_MANAGER } });
  const branchStaff = await prisma.user.findFirst({ where: { role: Role.BRANCH_STAFF } });
  const franchiseManager = await prisma.user.findFirst({ where: { role: Role.FRANCHISE_MANAGER } });
  const franchiseStaff = await prisma.user.findFirst({ where: { role: Role.FRANCHISE_STAFF } });

  const branchOrg = await prisma.organization.findFirst({ where: { type: 'BRANCH' } });
  const franchiseOrg = await prisma.organization.findFirst({ where: { type: 'FRANCHISE' } });

  const pkg = await prisma.packageMaster.findFirst({ where: { isActive: true } });
  assert.ok(pkg, 'Active package must exist');

  // Create or fetch two distinct test members
  const memberBranch = await prisma.memberProfile.findFirst({
    where: { ownerOrgId: branchOrg?.id },
    include: { user: true },
  });

  const memberFranchise = await prisma.memberProfile.findFirst({
    where: { ownerOrgId: franchiseOrg?.id },
    include: { user: true },
  });

  assert.ok(memberBranch, 'Branch member profile must exist');
  assert.ok(memberFranchise, 'Franchise member profile must exist');

  console.log('✅ Setup verified:');
  console.log(`   - Super Admin: ${superAdmin?.employeeId || superAdmin?.id}`);
  console.log(`   - Branch Org: ${branchOrg?.name} (${branchOrg?.id})`);
  console.log(`   - Franchise Org: ${franchiseOrg?.name} (${franchiseOrg?.id})`);
  console.log(`   - Test Package: ${pkg.name} (Cost: ₹${pkg.cost})`);

  // --------------------------------------------------------------------------
  // SCENARIO 1: Authorized branch staff can raise a valid invoice request
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 1: Authorized branch staff raises a valid invoice request');
  const branchStaffActor = {
    id: branchStaff?.id || branchManager?.id,
    role: branchStaff?.role || Role.BRANCH_STAFF,
    organizationId: branchOrg?.id,
  };

  const raiseRes1 = await invoicesService.raiseInvoiceRequest(branchStaffActor, {
    memberProfileId: memberBranch.id,
    packageId: pkg.id,
    paymentMode: 'ONLINE',
    bankName: 'HDFC Bank',
    transactionRef: 'UTR-TEST-001',
    notes: 'Online bank transfer via branch portal',
  });

  assert.ok(raiseRes1.invoice, 'Invoice request created');
  assert.equal(raiseRes1.invoice.status, 'PENDING', 'Initial status must be PENDING');
  assert.equal(raiseRes1.invoice.amount, pkg.cost, 'Price must be trusted package cost from DB');
  assert.ok(raiseRes1.invoice.requestNumber?.startsWith('REQ-'), 'Must have requestNumber');
  console.log(`  ✅ PASS: Request created with Request # ${raiseRes1.invoice.requestNumber}`);

  // --------------------------------------------------------------------------
  // SCENARIO 2: Unauthorized cross-branch member selection is blocked
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 2: Prevent unauthorized cross-branch member selection');
  await assert.rejects(
    async () => {
      await invoicesService.raiseInvoiceRequest(branchStaffActor, {
        memberProfileId: memberFranchise.id, // Franchise member selected by branch staff!
        packageId: pkg.id,
        paymentMode: 'ONLINE',
      });
    },
    /cannot raise an invoice request for a member belonging to another branch or franchise/,
    'Cross-branch request must be rejected with 403 Forbidden',
  );
  console.log('  ✅ PASS: Cross-branch invoice request successfully blocked');

  // --------------------------------------------------------------------------
  // SCENARIO 3: Branch invoice requests cannot be finalized without HQ approval
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 3: Branch Managers cannot bypass HQ approval for branch requests');
  const branchMgrActor = {
    id: branchManager?.id,
    role: Role.BRANCH_MANAGER,
    organizationId: branchOrg?.id,
  };

  await assert.rejects(
    async () => {
      await invoicesService.approveInvoice(branchMgrActor, raiseRes1.invoice.id, {
        notes: 'Attempted self-approval by branch manager',
      });
    },
    /Branch Managers and Branch Staff cannot approve branch invoices. HQ approval is required./,
    'Branch staff/manager cannot approve branch invoice',
  );
  console.log('  ✅ PASS: Branch manager bypass attempt rejected. HQ approval strictly required.');

  // --------------------------------------------------------------------------
  // SCENARIO 4: HQ approval finalizes branch invoice, generates invoice #, updates member
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 4: Super Admin / HQ finalizes approved branch invoice');
  const prevQuota = memberBranch.contactsQuota || 0;
  const hqActor = {
    id: superAdmin?.id,
    role: Role.SUPER_ADMIN,
    organizationId: 'org-hq',
  };

  const approveResBranch = await invoicesService.approveInvoice(hqActor, raiseRes1.invoice.id, {
    notes: 'Approved by Super Admin after payment confirmation',
  });

  assert.equal(approveResBranch.invoice.status, 'APPROVED', 'Status must be APPROVED');
  assert.ok(approveResBranch.invoice.invoiceNumber?.startsWith('INV-'), 'Invoice number generated');

  const updatedMemberBranch = await prisma.memberProfile.findUnique({ where: { id: memberBranch.id } });
  assert.equal(updatedMemberBranch?.packageType, 'PAID', 'Member status updated to PAID');
  assert.equal(updatedMemberBranch?.contactsQuota, prevQuota + pkg.contactReveals, 'Quota increased');
  console.log(`  ✅ PASS: Branch invoice approved! Invoice #: ${approveResBranch.invoice.invoiceNumber}`);

  // --------------------------------------------------------------------------
  // SCENARIO 5 & 6: Franchise Insufficient Wallet Limit error
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenarios 5 & 6: Insufficient franchise wallet balance displays exact error');
  // Set franchise wallet balance to low amount (e.g. ₹5)
  const wallet = await prisma.franchiseWallet.findUnique({ where: { franchiseOrgId: franchiseOrg!.id } });
  assert.ok(wallet, 'Franchise wallet must exist');

  await prisma.franchiseWallet.update({
    where: { id: wallet.id },
    data: { balance: 5 }, // Less than package cost!
  });

  const franchiseStaffActor = {
    id: franchiseStaff?.id || franchiseManager?.id,
    role: franchiseStaff?.role || Role.FRANCHISE_STAFF,
    organizationId: franchiseOrg?.id,
  };

  const raiseResFranchise = await invoicesService.raiseInvoiceRequest(franchiseStaffActor, {
    memberProfileId: memberFranchise.id,
    packageId: pkg.id,
    paymentMode: 'ONLINE',
  });

  const franchiseMgrActor = {
    id: franchiseManager?.id,
    role: Role.FRANCHISE_MANAGER,
    organizationId: franchiseOrg?.id,
  };

  await assert.rejects(
    async () => {
      await invoicesService.approveInvoice(franchiseMgrActor, raiseResFranchise.invoice.id, {});
    },
    (err: any) => {
      assert.equal(err.message, 'Insufficient Wallet Limit', 'Error message must match exactly');
      return true;
    },
    'Must throw exact error "Insufficient Wallet Limit"',
  );

  // Verify request remained pending and balance untouched
  const checkPending = await prisma.memberInvoice.findUnique({ where: { id: raiseResFranchise.invoice.id } });
  assert.equal(checkPending?.status, 'PENDING', 'Request must remain PENDING');
  const checkWallet = await prisma.franchiseWallet.findUnique({ where: { id: wallet.id } });
  assert.equal(checkWallet?.balance, 5, 'Wallet balance must remain untouched at 5');
  console.log('  ✅ PASS: Exact error "Insufficient Wallet Limit" thrown; request remains PENDING');

  // --------------------------------------------------------------------------
  // SCENARIO 7 & 8: Top-up wallet and atomic successful approval with single deduction
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenarios 7 & 8: Super Admin records manual top-up, then Franchise Manager approves');
  // Top-up wallet with ₹20,000
  const topupRes = await walletsService.topupWallet(hqActor, franchiseOrg!.id, {
    amount: 20000,
    referenceId: 'UTR-BANK-TOPUP-99',
    reason: 'Verified NEFT payment at HQ bank',
  });
  assert.equal(topupRes.wallet.balance, 20005, 'Balance updated to 20005');
  console.log(`  ✅ PASS: Wallet topped up. New balance: ₹${topupRes.wallet.balance}`);

  // Now Franchise Manager approves
  const approveResFranchise = await invoicesService.approveInvoice(
    franchiseMgrActor,
    raiseResFranchise.invoice.id,
    { notes: 'Approved by Franchise Manager' },
  );

  assert.equal(approveResFranchise.invoice.status, 'APPROVED');
  const walletAfterApproval = await prisma.franchiseWallet.findUnique({ where: { id: wallet.id } });
  assert.equal(
    walletAfterApproval?.balance,
    20005 - pkg.cost,
    'Amount deducted exactly once from franchise wallet',
  );
  console.log(`  ✅ PASS: Franchise invoice approved! Wallet deducted exactly once to ₹${walletAfterApproval?.balance}`);

  // --------------------------------------------------------------------------
  // SCENARIO 9: Cash Payment Handling with Cash Received Declaration
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 9: Cash payment workflow with Cash Received declaration');
  const cashRequest = await invoicesService.raiseInvoiceRequest(branchStaffActor, {
    memberProfileId: memberBranch.id,
    packageId: pkg.id,
    paymentMode: 'CASH',
    cashReceivedDeclaration: true,
    notes: 'Walk-in cash received at counter',
  });

  assert.equal(cashRequest.invoice.status, 'PENDING', 'Cash request must be PENDING initially');
  assert.equal(cashRequest.invoice.isCash, true);
  assert.equal(cashRequest.invoice.cashReceivedDeclaration, true);
  assert.equal(cashRequest.invoice.cashReceivedById, branchStaffActor.id);
  console.log('  ✅ PASS: Cash declaration recorded; request remains PENDING until official approval');

  // --------------------------------------------------------------------------
  // SCENARIO 10: Prevention of duplicate approvals
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 10: Duplicate approval prevention');
  await assert.rejects(
    async () => {
      // Re-approving already approved invoice
      await invoicesService.approveInvoice(hqActor, approveResBranch.invoice.id, {});
    },
    /Cannot approve: Invoice is already in APPROVED status/,
  );
  console.log('  ✅ PASS: Duplicate approval rejected');

  // --------------------------------------------------------------------------
  // SCENARIO 11 & 12: Invoice Editing & Bulk Download restricted to Super Admin / Admin
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenarios 11 & 12: Invoice Editing and Export restricted to Super Admin & Admin');
  // Branch staff attempting to edit invoice -> blocked
  await assert.rejects(
    async () => {
      await invoicesService.editInvoice(branchStaffActor, approveResBranch.invoice.id, {
        amount: 5000,
        editReason: 'Unauthorized edit attempt',
      });
    },
    /Only Super Admin and Admin are authorized to modify existing invoices/,
  );

  // Super Admin edits invoice with audit trail
  const editRes = await invoicesService.editInvoice(hqActor, approveResBranch.invoice.id, {
    notes: 'Updated invoice notes with audit justification',
    editReason: 'Customer requested note correction',
  });
  assert.ok(editRes.invoice);

  const editAudit = await prisma.financialAuditLog.findFirst({
    where: { resourceId: approveResBranch.invoice.id, action: 'INVOICE_EDITED' },
  });
  assert.ok(editAudit, 'Financial audit log recorded for edit');
  console.log('  ✅ PASS: Invoice edit RBAC enforced and audit trail recorded');

  // Bulk export check
  const exportRes = await invoicesService.exportInvoices(hqActor, { status: 'APPROVED' });
  assert.ok(exportRes.csvContent.includes('Invoice Number'), 'CSV header present');
  console.log(`  ✅ PASS: Bulk export generated with ${exportRes.count} records`);

  // --------------------------------------------------------------------------
  // SCENARIO 13: Commission calculations and immutable transaction snapshots
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 13: Commission rules and immutable calculation');
  const commTx = await prisma.commissionTransaction.findFirst({
    where: { invoiceId: approveResBranch.invoice.id },
  });
  assert.ok(commTx, 'Commission transaction must be recorded');
  assert.ok(commTx.commissionAmount > 0, 'Commission amount calculated');
  console.log(`  ✅ PASS: Commission transaction recorded: ₹${commTx.commissionAmount} (${commTx.rateValue}% rate)`);

  // --------------------------------------------------------------------------
  // SCENARIO 14: Financial Ledgers (HQ, Franchise, Agent)
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 14: Multi-ledger audit entries');
  const hqLedger = await ledgersService.getLedgerEntries(hqActor, { ledgerType: 'HQ' });
  assert.ok(hqLedger.entries.length > 0, 'HQ ledger entries exist');

  const franchiseLedger = await ledgersService.getLedgerEntries(franchiseMgrActor, {});
  assert.ok(franchiseLedger.entries.length > 0, 'Franchise ledger entries exist');
  console.log(`  ✅ PASS: HQ ledger has ${hqLedger.entries.length} entries; Franchise ledger has ${franchiseLedger.entries.length} entries`);

  // --------------------------------------------------------------------------
  // SCENARIO 15: External Revenue Recording for HQ (Ads & Wedding Services)
  // --------------------------------------------------------------------------
  console.log('\n📋 Scenario 15: Record external revenue for Advertisements and Wedding Services');
  const revRes = await ledgersService.recordExternalRevenue(hqActor, {
    category: 'AD_REVENUE',
    amount: 15000,
    description: 'Hyderabad Jewellers Home Banner Slot Q4',
    referenceNumber: 'UTR-AD-9912',
  });
  assert.equal(revRes.entry.category, 'AD_REVENUE');
  assert.equal(revRes.entry.amount, 15000);
  console.log('  ✅ PASS: Advertisement revenue recorded in HQ ledger');

  console.log('\n🎉 ALL SECTION 6 TEST SCENARIOS PASSED SUCCESSFULLY! 🚀\n');
}

runTests()
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

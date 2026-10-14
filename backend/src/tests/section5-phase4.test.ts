import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { MasterDataService } from '../admin/master-data.service';
import { AdminPackagesService } from '../admin/admin-packages.service';
import { AdvancedSearchService } from '../admin/advanced-search.service';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const masterDataService = new MasterDataService(prisma, auditService);
const packagesService = new AdminPackagesService(prisma, auditService);
const searchService = new AdvancedSearchService(prisma);

async function runTests() {
  console.log('🧪 Starting Section 5 — Phase 4: Master Data, Packages & Advanced Search Tests\n');

  // Super Admin & Branch Staff actors
  let superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        mobile: `99777${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: 'dummy',
        role: Role.SUPER_ADMIN,
        fullName: 'Super Administrator',
        status: 'ACTIVE',
      },
    });
  }

  const branchStaff = {
    id: 'branch-staff-mock-id',
    role: Role.BRANCH_STAFF,
    organizationId: null,
  };

  // Test 1: Super Admin adds Master Data option
  console.log('📋 Test 1: Super Admin adds Master Data option (Category: OCCUPATION)');
  const occupation = await masterDataService.createOption(superAdmin, {
    category: 'OCCUPATION',
    code: `TECH_LEAD_${Date.now()}`,
    label: 'Technical Lead',
    sortOrder: 1,
  });
  assert.ok(occupation.id);
  assert.strictEqual(occupation.label, 'Technical Lead');
  console.log(`  ✅ PASS: Master data option created: ${occupation.code}`);

  // Test 2: Non-Super Admin denied from modifying Master Data
  console.log('\n📋 Test 2: Non-Super Admin denied from adding Master Data');
  await assert.rejects(
    async () => {
      await masterDataService.createOption(branchStaff, {
        category: 'OCCUPATION',
        code: 'DEV_TEST',
        label: 'Developer',
      });
    },
    /Only Super Admin can modify global Master Data/,
    'Branch staff must be forbidden',
  );
  console.log('  ✅ PASS: Role restriction enforced on Master Data creation');

  // Test 3: Update Master Data option
  console.log('\n📋 Test 3: Update Master Data option label and sortOrder');
  const updatedOpt = await masterDataService.updateOption(superAdmin, occupation.id, {
    label: 'Principal Technical Lead',
    sortOrder: 5,
  });
  assert.strictEqual(updatedOpt.label, 'Principal Technical Lead');
  assert.strictEqual(updatedOpt.sortOrder, 5);
  console.log('  ✅ PASS: Master data option successfully updated');

  // Test 4: Delete Master Data option
  console.log('\n📋 Test 4: Delete unused Master Data option');
  const delRes = await masterDataService.deleteOption(superAdmin, occupation.id);
  assert.ok(delRes.message.includes('deleted successfully'));
  console.log('  ✅ PASS: Unused master data option safely deleted');

  // Test 5: Terms & Conditions management
  console.log('\n📋 Test 5: Terms & Conditions update and retrieval');
  const termsRes = (await masterDataService.updateTermsAndConditions(
    superAdmin,
    'Updated registration terms & privacy guidelines for all Telugu communities.',
  )) as any;
  assert.ok(termsRes.content.includes('Telugu communities'));
  const fetchedTerms = (await masterDataService.getTermsAndConditions()) as any;
  assert.strictEqual(fetchedTerms.content, termsRes.content);
  console.log('  ✅ PASS: Terms & Conditions configured and verified');

  // Test 6: Package Creation with all Section 5.7 fields
  console.log('\n📋 Test 6: Package Module — Create new subscription package');
  const testPkgName = `Diamond Royal ${Math.floor(100 + Math.random() * 900)}`;
  const pkg = await packagesService.createPackage(superAdmin, {
    name: testPkgName,
    validityDays: 180,
    contactReveals: 150,
    ticketQuota: 25,
    emiEligible: true,
    cost: 12500,
    servicesProvided: 'Dedicated Relationship Manager, 150 Reveals, Top Placement',
    featuredProfileEligible: true,
  });
  assert.ok(pkg.id);
  assert.strictEqual(pkg.name, testPkgName);
  assert.strictEqual(pkg.emiEligible, true);
  assert.strictEqual(pkg.featuredProfileEligible, true);
  console.log(`  ✅ PASS: Package created: ${pkg.name} (EMI: Yes, Featured: Yes)`);

  // Test 7: Package Update and Deactivate
  console.log('\n📋 Test 7: Package Module — Update and Deactivate package');
  const updatedPkg = await packagesService.updatePackage(superAdmin, pkg.id, {
    cost: 14000,
    ticketQuota: 30,
  });
  assert.strictEqual(updatedPkg.cost, 14000);
  assert.strictEqual(updatedPkg.ticketQuota, 30);

  const deactRes = await packagesService.deleteOrDeactivatePackage(superAdmin, pkg.id);
  assert.ok(deactRes.message);
  console.log('  ✅ PASS: Package updated and deactivated successfully');

  // Test 8: Advanced Search with combinable filters
  console.log('\n📋 Test 8: Advanced Search with combinable filters');
  const searchResults = await searchService.searchProfiles(superAdmin, {
    gender: 'Female',
    minAge: 20,
    maxAge: 40,
  });
  assert.ok(typeof searchResults.total === 'number');
  assert.ok(Array.isArray(searchResults.results));
  console.log(`  ✅ PASS: Advanced search executed with combinable filters (matched: ${searchResults.results.length})`);

  // Test 9: Advanced Search pagination
  console.log('\n📋 Test 9: Advanced Search pagination');
  const paged = await searchService.searchProfiles(superAdmin, {
    page: 1,
    limit: 5,
  });
  assert.ok(paged.results.length <= 5, 'Results adhere to limit');
  console.log(`  ✅ PASS: Advanced search pagination verified (limit: 5, count: ${paged.results.length})`);

  console.log('\n🎉 ALL 9 SECTION 5 PHASE 4 TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

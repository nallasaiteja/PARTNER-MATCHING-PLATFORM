import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
import { AuditService } from '../common/audit/audit.service';
import { AdminMembersService } from '../admin/admin-members.service';
import { BranchService } from '../branch/branch.service';
import { Role } from '../common/constants/roles.constants';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const prisma = new PrismaService();
const scopeGuard = new ScopeGuardService(prisma);
const auditService = new AuditService(prisma);
const profilesService = new ProfilesService(prisma, auditService, scopeGuard);
const adminMembersService = new AdminMembersService(prisma, auditService);
const branchService = new BranchService(prisma, auditService);

async function runVerificationWorkflowTests() {
  console.log('====================================================');
  console.log('    MEMBER PROFILE SUBMISSION & VERIFICATION TESTS   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // Track created entities for clean cleanup
  let branchA: any;
  let branchB: any;
  let adminUser: any;
  let managerA: any;
  let managerB: any;
  let memberUser: any;
  let testProfile: any;

  try {
    // 0. Setup branches & users
    branchA = await prisma.organization.findFirst({
      where: { type: 'BRANCH' },
    });
    if (!branchA) {
      branchA = await prisma.organization.create({
        data: { name: 'Verification Test Branch A (Hyderabad)', type: 'BRANCH' },
      });
    }

    branchB = await prisma.organization.findFirst({
      where: { type: 'BRANCH', id: { not: branchA.id } },
    });
    if (!branchB) {
      branchB = await prisma.organization.create({
        data: { name: 'Verification Test Branch B (Vijayawada)', type: 'BRANCH' },
      });
    }

    adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN, status: 'ACTIVE' },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          mobile: '9899000001',
          email: 'testadmin_verify@pmp.com',
          passwordHash: 'dummy',
          role: Role.ADMIN,
          status: 'ACTIVE',
        },
      });
    }

    const testTime = Date.now();
    managerA = await prisma.user.create({
      data: {
        mobile: `98991${String(testTime).slice(-5)}`,
        email: `managerA_${testTime}@pmp.com`,
        passwordHash: 'dummy',
        role: Role.BRANCH_MANAGER,
        status: 'ACTIVE',
        organizationId: branchA.id,
      },
    });

    managerB = await prisma.user.create({
      data: {
        mobile: `98992${String(testTime).slice(-5)}`,
        email: `managerB_${testTime}@pmp.com`,
        passwordHash: 'dummy',
        role: Role.BRANCH_MANAGER,
        status: 'ACTIVE',
        organizationId: branchB.id,
      },
    });

    memberUser = await prisma.user.create({
      data: {
        mobile: `98993${String(testTime).slice(-5)}`,
        email: `member_${testTime}@pmp.com`,
        passwordHash: 'dummy',
        role: Role.MEMBER,
        status: 'ACTIVE',
        organizationId: branchA.id,
      },
    });

    const memberActor = {
      id: memberUser.id,
      role: Role.MEMBER,
      organizationId: branchA.id,
    };
    const adminActor = {
      id: adminUser.id,
      role: Role.ADMIN,
      organizationId: null,
    };
    const managerActorA = {
      id: managerA.id,
      role: Role.BRANCH_MANAGER,
      organizationId: branchA.id,
    };
    const managerActorB = {
      id: managerB.id,
      role: Role.BRANCH_MANAGER,
      organizationId: branchB.id,
    };

    // 1. Initial Member Profile Creation (Draft)
    testProfile = await prisma.memberProfile.create({
      data: {
        memberId: `M_TEST_${testTime}`,
        userId: memberUser.id,
        firstName: 'Ramesh',
        lastName: 'Chowdary',
        gender: 'Male',
        dateOfBirth: new Date('1994-06-15'),
        currentStep: 1,
        completedSteps: [1],
        idProofType: 'Aadhaar Card',
        idProofNumber: '1234-5678-9012',
        idProofFileUrl: 'https://example.com/proofs/initial_aadhaar.pdf',
        packageType: 'FREE',
        ownerOrgId: branchA.id,
        profileData: {
          step1: { firstName: 'Ramesh', lastName: 'Chowdary' },
          step5: {
            mobileVerified: true,
            emailVerified: true,
            idProofUploaded: true,
            idProofVerified: false,
            verificationStatus: 'DRAFT',
          },
        },
      },
    });

    assert(Boolean(testProfile.id), 'Test Profile successfully initialized in Supabase PostgreSQL');

    // 2. Member Completes All 5 Steps & Submits Profile
    console.log('\n--- Step 2: Member Completing Profile & Submitting for Verification ---');
    const updateDto: any = {
      currentStep: 5,
      completedSteps: [1, 2, 3, 4, 5],
      idProofType: 'Aadhaar Card',
      idProofNumber: '1234-5678-9012',
      idProofFileUrl: 'https://example.com/proofs/final_aadhaar.pdf',
      profileData: {
        step5: {
          willingToTakePackage: true,
          mobileRevelationPreference: '0 Hours',
          verificationStatus: 'PENDING_VERIFICATION',
        },
      },
    };

    const updatedProfile = await profilesService.updateProfile(
      memberActor,
      testProfile.id,
      updateDto,
    );

    const step5Data = (updatedProfile.profileData as any)?.step5 || {};
    assert(
      step5Data.verificationStatus === 'PENDING_VERIFICATION',
      'Profile verificationStatus is set to PENDING_VERIFICATION on Complete Profile',
    );
    assert(
      step5Data.idProofVerified === false,
      'Profile is NOT auto-verified upon completion (requires manual review)',
    );
    assert(
      step5Data.idProofStatus === 'PENDING_REVIEW',
      'idProofStatus is set to PENDING_REVIEW when valid proof URL is present',
    );
    assert(
      Boolean(step5Data.submittedForVerificationAt),
      'Submission timestamp is recorded in step5.submittedForVerificationAt',
    );

    // 3. Admin Panel Verification Queue Query
    console.log('\n--- Step 3: Admin Panel Pending Verification View ---');
    const adminList = await adminMembersService.listMembers(adminActor, {
      type: 'PENDING_VERIFICATION',
      search: testProfile.memberId,
    });

    assert(adminList.total >= 1, 'Admin listMembers with type=PENDING_VERIFICATION returns submitted profile');
    const adminMemberRecord = adminList.members.find((m) => m.id === testProfile.id);
    assert(Boolean(adminMemberRecord), 'Admin finds submitted member in verification queue');
    assert(
      adminMemberRecord?.verificationStatus === 'PENDING_VERIFICATION',
      'Admin record contains verificationStatus: PENDING_VERIFICATION',
    );
    assert(
      adminMemberRecord?.idProofStatus === 'PENDING_REVIEW',
      'Admin record contains idProofStatus: PENDING_REVIEW',
    );
    assert(
      adminMemberRecord?.branchName === branchA.name,
      'Admin record displays correct assigned branch name',
    );
    assert(
      adminMemberRecord?.idProofFileUrl === 'https://example.com/proofs/final_aadhaar.pdf',
      'Admin record contains secure uploaded ID proof URL',
    );

    // 4. Branch Manager Queue & Branch Scoping / Isolation
    console.log('\n--- Step 4: Branch Manager Dashboard Scoping & Isolation ---');
    const branchAQueue = await branchService.getPendingVerifications(managerActorA);
    const inBranchA = branchAQueue.records.find((r) => r.id === testProfile.id);
    assert(
      Boolean(inBranchA),
      'Authorized Branch Manager A sees member profile belonging to Branch A',
    );
    assert(
      inBranchA?.idProofDocumentUrl === 'https://example.com/proofs/final_aadhaar.pdf',
      'Branch Manager A receives idProofDocumentUrl for review',
    );

    const branchBQueue = await branchService.getPendingVerifications(managerActorB);
    const inBranchB = branchBQueue.records.find((r) => r.id === testProfile.id);
    assert(
      !inBranchB,
      'Branch Manager B (other branch) CANNOT see Branch A member profile (strict branch isolation)',
    );

    // Test unauthorized branch action rejection
    let unauthorizedActionBlocked = false;
    try {
      await branchService.verifyMemberIdProof(managerActorB, testProfile.id, {
        verified: true,
      });
    } catch (err) {
      if (err instanceof ForbiddenException) {
        unauthorizedActionBlocked = true;
      }
    }
    assert(
      unauthorizedActionBlocked,
      'Branch Manager B is forbidden from taking verification action on Branch A profile',
    );

    // 5. ID Proof Rejection Workflow
    console.log('\n--- Step 5: ID Proof Rejection with Mandatory Reason ---');
    let rejectionWithoutReasonBlocked = false;
    try {
      await branchService.verifyMemberIdProof(managerActorA, testProfile.id, {
        verified: false,
        rejectionReason: '',
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        rejectionWithoutReasonBlocked = true;
      }
    }
    assert(
      rejectionWithoutReasonBlocked,
      'Rejection without reason is blocked (at least 5 characters required)',
    );

    const validRejectionReason = 'Aadhaar card image is blurry and date of birth is illegible.';
    const rejectResult = await branchService.verifyMemberIdProof(
      managerActorA,
      testProfile.id,
      {
        verified: false,
        rejectionReason: validRejectionReason,
      },
    );

    const rejectedStep5 = (rejectResult.member.profileData as any)?.step5 || {};
    assert(
      rejectedStep5.idProofStatus === 'REJECTED' && rejectedStep5.verificationStatus === 'REJECTED',
      'Rejection updates both idProofStatus and verificationStatus to REJECTED',
    );
    assert(
      rejectedStep5.idProofRejectionReason === validRejectionReason,
      'Mandatory rejection reason is recorded in Supabase profileData',
    );
    assert(
      rejectedStep5.idProofRejectedBy === managerA.id && Boolean(rejectedStep5.idProofRejectedAt),
      'Reviewer ID and timestamp are recorded on rejection',
    );

    // 6. Member Resubmission Workflow
    console.log('\n--- Step 6: Member Resubmission after Rejection ---');
    const resubmissionDto: any = {
      currentStep: 5,
      completedSteps: [1, 2, 3, 4, 5],
      idProofFileUrl: 'https://example.com/proofs/clear_high_res_aadhaar.pdf',
      profileData: {
        step5: {
          verificationStatus: 'PENDING_VERIFICATION',
        },
      },
    };

    const resubmittedProfile = await profilesService.updateProfile(
      memberActor,
      testProfile.id,
      resubmissionDto,
    );

    const resubmittedStep5 = (resubmittedProfile.profileData as any)?.step5 || {};
    assert(
      resubmittedStep5.verificationStatus === 'PENDING_VERIFICATION',
      'Resubmission resets verificationStatus from REJECTED back to PENDING_VERIFICATION',
    );
    assert(
      resubmittedStep5.idProofStatus === 'PENDING_REVIEW',
      'Resubmission resets idProofStatus to PENDING_REVIEW',
    );
    assert(
      resubmittedProfile.idProofFileUrl === 'https://example.com/proofs/clear_high_res_aadhaar.pdf',
      'Resubmission updates idProofFileUrl to the corrected document',
    );

    // 7. Verification Approval Workflow
    console.log('\n--- Step 7: ID Proof Approval Workflow ---');
    const approvalResult = await profilesService.verifyIdProof(
      adminActor,
      testProfile.id,
      true,
    );

    const approvedProfile = await prisma.memberProfile.findUnique({
      where: { id: testProfile.id },
    });
    const approvedStep5 = (approvedProfile?.profileData as any)?.step5 || {};

    assert(
      approvedStep5.idProofVerified === true,
      'Approval sets idProofVerified to true',
    );
    assert(
      approvedStep5.idProofStatus === 'VERIFIED',
      'Approval sets idProofStatus to VERIFIED',
    );
    assert(
      approvedStep5.verificationStatus === 'VERIFIED',
      'Approval sets verificationStatus to VERIFIED',
    );
    assert(
      approvedStep5.idProofVerifiedBy === adminUser.id && Boolean(approvedStep5.idProofVerifiedAt),
      'Approval records reviewer ID and approval timestamp in Supabase PostgreSQL',
    );

  } catch (err: any) {
    console.error('Fatal error during verification workflow test:', err);
    failed++;
  } finally {
    // Cleanup test data safely
    if (testProfile?.id) {
      await prisma.staffProfileVisit.deleteMany({ where: { memberProfileId: testProfile.id } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { resourceId: testProfile.id } }).catch(() => {});
      await prisma.memberProfile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
    if (memberUser?.id) await prisma.user.delete({ where: { id: memberUser.id } }).catch(() => {});
    if (managerA?.id) await prisma.user.delete({ where: { id: managerA.id } }).catch(() => {});
    if (managerB?.id) await prisma.user.delete({ where: { id: managerB.id } }).catch(() => {});

    await prisma.$disconnect();

    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log('====================================================');
    if (failed > 0) process.exit(1);
  }
}

void runVerificationWorkflowTests();

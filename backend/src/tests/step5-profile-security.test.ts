import * as assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProfilesService } from '../profiles/profiles.service';
import { assertImmutableProfileFields } from '../profiles/immutable-profile.validation';
import { applyProfilePaymentDate } from '../profiles/profile-payment-date';
import { validateAndSanitizeStep5 } from '../profiles/verification-settings.validation';

const validProfileData = {
  step1: {
    firstName: 'Member',
    lastName: 'Example',
    mobile: '+15555550123',
    email: 'member@example.test',
    dateOfBirth: '1995-02-03',
    religion: 'Hindu',
    religionId: 'religion-1',
    caste: 'Caste A',
    casteId: 'caste-1',
  },
  step5: {
    willingToTakePackage: true,
    mobileRevelationPreference: '24 Hours',
    profilePaymentDate: '2026-11-20',
  },
};

function createService(profile: any, eligiblePackages: string[] = ['PAID']) {
  const auditEvents: any[] = [];
  let saved = profile;
  const prisma: any = {
    memberProfile: {
      findUnique: async () => saved,
      findMany: async () => [saved],
      update: async ({ data }: any) => {
        saved = { ...saved, ...data };
        return saved;
      },
    },
    platformSetting: {
      findUnique: async () => ({ value: eligiblePackages }),
      upsert: async ({ create, update }: any) => ({ ...create, ...update }),
    },
  };
  const scopeGuard: any = {
    requireProfileOwnership: async () => undefined,
    requireOrganizationScope: async () => undefined,
    buildProfileScopeWhere: () => ({ id: 'NEVER' }),
  };
  const auditService: any = { log: async (event: any) => auditEvents.push(event) };
  return {
    service: new ProfilesService(prisma, auditService, scopeGuard),
    auditEvents,
    getSaved: () => saved,
  };
}

async function run() {
  const current = {
    firstName: 'Member',
    lastName: 'Example',
    dateOfBirth: new Date('1995-02-03T00:00:00.000Z'),
    profileData: { step1: validProfileData.step1 },
  };
  const currentUser = { mobile: '+15555550123', email: 'member@example.test' };
  assert.doesNotThrow(() => assertImmutableProfileFields(current, currentUser, {
    firstName: 'Member', lastName: 'Example', dateOfBirth: '1995-02-03',
    mobile: currentUser.mobile, email: currentUser.email,
  }, validProfileData));
  assert.throws(() => assertImmutableProfileFields(current, currentUser, { firstName: 'Changed' }), BadRequestException);
  assert.throws(() => assertImmutableProfileFields(current, currentUser, { dateOfBirth: '1995-02-04' }), BadRequestException);
  assert.throws(() => assertImmutableProfileFields(current, currentUser, { mobile: '+15555550999' }), BadRequestException);
  assert.throws(() => assertImmutableProfileFields(current, currentUser, { email: 'changed@example.test' }), BadRequestException);
  assert.throws(() => assertImmutableProfileFields(current, currentUser, {}, {
    step1: { religion: 'Different', caste: 'Caste A' },
  }), BadRequestException);
  assert.throws(() => assertImmutableProfileFields(current, currentUser, {}, {
    step1: { religion: 'Hindu', caste: 'Caste B' },
  }), BadRequestException);

  for (const preference of ['0 Hours', '24 Hours', '72 Hours', 'Acceptance Preference']) {
    assert.equal(validateAndSanitizeStep5({ mobileRevelationPreference: preference }).mobileRevelationPreference, preference);
  }
  const sanitized = validateAndSanitizeStep5({
    ...validProfileData.step5,
    mobileVerified: true,
    emailVerified: true,
    idProofVerified: true,
  });
  assert.equal('mobileVerified' in sanitized, false);
  assert.equal('idProofVerified' in sanitized, false);

  const storedDate = applyProfilePaymentDate(
    { step5: { profilePaymentDate: '2026-11-20' } },
    {},
    { id: 'member-1', role: 'MEMBER' },
    'member-1',
  );
  assert.equal(storedDate.profileData?.step5.profilePaymentDateSetBy, 'MEMBER');
  const staffDate = applyProfilePaymentDate(
    { step5: { profilePaymentDate: '2026-11-20' } },
    {},
    { id: 'staff-1', role: 'BRANCH_MANAGER' },
    'member-1',
  );
  assert.equal(staffDate.profileData?.step5.profilePaymentDateSetByStaffId, 'staff-1');
  assert.throws(() => applyProfilePaymentDate(
    { step5: { profilePaymentDate: '2026-11-20' } },
    {},
    { id: 'other-member', role: 'MEMBER' },
    'member-1',
  ), ForbiddenException);

  const freeProfile = {
    id: 'profile-1', userId: 'member-1', packageType: 'FREE',
    profileData: { step5: { mobileRevelationPreference: '24 Hours' } },
    user: currentUser,
  };
  const freeService = createService(freeProfile, []);
  await assert.rejects(freeService.service.updateProfile(
    { id: 'member-1', role: 'MEMBER', organizationId: null },
    'profile-1',
    { profileData: { step5: { mobileRevelationPreference: 'Acceptance Preference' } } } as any,
  ), ForbiddenException);

  const paidProfile = { ...freeProfile, packageType: 'PAID' };
  const paidService = createService(paidProfile, ['PAID']);
  await paidService.service.updateProfile(
    { id: 'member-1', role: 'MEMBER', organizationId: null },
    'profile-1',
    { profileData: { step5: { mobileRevelationPreference: 'Acceptance Preference' } } } as any,
  );
  assert.equal(paidService.getSaved().profileData.step5.mobileRevelationPreference, 'Acceptance Preference');
  const settingUpdate = await paidService.service.setContactRevealPackages(
    { id: 'admin-1', role: 'ADMIN', organizationId: 'hq-1' },
    [],
  );
  assert.deepEqual(settingUpdate.packageTypes, []);
  assert.equal(paidService.auditEvents.at(-1).resourceType, 'PlatformSetting');

  const memberListService = createService({
    ...freeProfile,
    userId: 'other-member',
    profileData: { step1: { mobile: currentUser.mobile } },
    user: { id: 'other-member', mobile: currentUser.mobile, mobileVerified: true, emailVerified: false },
  });
  const listed = await memberListService.service.listProfiles({
    id: 'member-1', role: 'MEMBER', organizationId: null,
  });
  assert.equal(listed[0].user.mobile, null);
  assert.equal(listed[0].profileData.step1.mobile, undefined);
  await assert.rejects(memberListService.service.getProfileById(
    { id: 'member-1', role: 'MEMBER', organizationId: null },
    'profile-1',
  ), ForbiddenException);

  const reviewService = createService({
    ...freeProfile,
    idProofFileUrl: '/uploads/id-proofs/proof.pdf',
    profileData: { step1: validProfileData.step1, step5: {} },
  });
  await reviewService.service.verifyIdProof(
    { id: 'branch-manager-1', role: 'BRANCH_MANAGER', organizationId: 'branch-1' },
    'profile-1',
    true,
  );
  assert.equal(reviewService.getSaved().profileData.step5.idProofVerified, true);
  assert.equal(reviewService.getSaved().profileData.step5.idProofVerifiedBy, 'branch-manager-1');
  await assert.rejects(reviewService.service.verifyIdProof(
    { id: 'branch-agent-1', role: 'BRANCH_AGENT', organizationId: 'branch-1' },
    'profile-1',
    true,
  ), ForbiddenException);

  console.log('Step 5 immutability, package eligibility, payment-date authorization, ID review, and phone protection passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
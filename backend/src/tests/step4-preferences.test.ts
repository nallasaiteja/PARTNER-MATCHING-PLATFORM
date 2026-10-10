import * as assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { ProfilesService } from '../profiles/profiles.service';
import { validateAndSanitizeStep4 } from '../profiles/partner-preferences.validation';

const preferences = {
  preferredMaritalStatus: ['Unmarried', 'Divorced'],
  ageRangeMin: 24,
  ageRangeMax: 32,
  heightRangeMin: `5'2"`,
  heightRangeMax: `6'0"`,
  preferredFamilyStatus: ['Middle Class'],
  interCasteAllowed: true,
  preferredCastes: ['caste-1'],
  kujaDoshamPreference: 'Any',
  preferredComplexion: ['Medium'],
  smokePreference: false,
  drinkPreference: true,
  preferredEducation: ['B.Tech / B.E.'],
  preferredProfession: ['Engineer'],
  preferredCitiesOfWork: ['Hyderabad'],
  passportHolderPreference: true,
  preferredWorkingLocation: 'Abroad',
  preferredCountriesAbroad: ['country-1'],
  paymentInterestDate: '2026-11-01',
  paymentInterestDateSetBy: 'MEMBER',
  paymentInterestDateSetByStaffId: 'forged-id',
};

function createService(existingDate = '2026-10-20') {
  const auditEvents: any[] = [];
  const existing = {
    id: 'profile-1',
    userId: 'member-1',
    profileData: {
      step1: { firstName: 'Member' },
      step2: { education: 'MBA / PGDM' },
      step3: { familyStatus: 'Middle Class' },
      step4: {
        preferredMaritalStatus: ['Unmarried'],
        ageRangeMin: 21,
        ageRangeMax: 28,
        heightRangeMin: `5'0"`,
        heightRangeMax: `6'0"`,
        paymentInterestDate: existingDate,
        paymentInterestDateSetBy: 'MEMBER',
      },
    },
  };
  let saved: any;
  const prisma: any = {
    memberProfile: {
      findUnique: async () => existing,
      update: async ({ data }: any) => {
        saved = { ...existing, ...data };
        return saved;
      },
    },
    user: { update: async () => undefined },
  };
  const scopeGuard: any = {
    requireProfileOwnership: async () => undefined,
    requireOrganizationScope: async () => undefined,
  };
  const auditService: any = {
    log: async (event: any) => auditEvents.push(event),
  };

  return {
    service: new ProfilesService(prisma, auditService, scopeGuard),
    auditEvents,
    getSaved: () => saved,
  };
}

async function run() {
  const { paymentInterestDateSetBy: _clientSetter, paymentInterestDateSetByStaffId: _clientStaffId, ...expectedPreferences } = preferences;
  const memberEdit = createService();
  const updated = await memberEdit.service.updateProfile(
    { id: 'member-1', role: 'MEMBER', organizationId: null },
    'profile-1',
    { profileData: { step4: preferences } } as any,
  );

  assert.deepEqual(memberEdit.getSaved().profileData.step4, {
    ...expectedPreferences,
    paymentInterestDateSetBy: 'MEMBER',
  });
  const restoredProfileData = updated.profileData as Record<string, any>;
  assert.deepEqual(restoredProfileData.step1, { firstName: 'Member' });
  assert.deepEqual(restoredProfileData.step2, { education: 'MBA / PGDM' });
  assert.deepEqual(restoredProfileData.step3, { familyStatus: 'Middle Class' });
  assert.equal(memberEdit.auditEvents[0].metadata.setBy, 'MEMBER');
  assert.equal(memberEdit.auditEvents[0].metadata.staffId, null);

  const staffEdit = createService();
  await staffEdit.service.updateProfile(
    { id: 'staff-9', role: 'BRANCH_AGENT', organizationId: 'branch-1' },
    'profile-1',
    { profileData: { step4: { ...preferences, paymentInterestDate: '2026-11-02' } } } as any,
  );
  assert.equal(staffEdit.getSaved().profileData.step4.paymentInterestDateSetBy, 'STAFF');
  assert.equal(staffEdit.getSaved().profileData.step4.paymentInterestDateSetByStaffId, 'staff-9');
  assert.equal(staffEdit.auditEvents[0].metadata.staffId, 'staff-9');

  const clearDateEdit = createService();
  await clearDateEdit.service.updateProfile(
    { id: 'member-1', role: 'MEMBER', organizationId: null },
    'profile-1',
    { profileData: { step4: { ...preferences, paymentInterestDate: '' } } } as any,
  );
  assert.equal(clearDateEdit.getSaved().profileData.step4.paymentInterestDate, '');

  const unauthorizedEdit = createService();
  await assert.rejects(
    unauthorizedEdit.service.updateProfile(
      { id: 'not-member-1', role: 'MEMBER', organizationId: null },
      'profile-1',
      { profileData: { step4: { ...preferences, paymentInterestDate: '2026-11-03' } } } as any,
    ),
    ForbiddenException,
  );

  const partialDraft = validateAndSanitizeStep4({
    ...expectedPreferences,
    interCasteAllowed: true,
    preferredCastes: [],
    preferredWorkingLocation: 'Abroad',
    preferredCountriesAbroad: [],
  });
  assert.deepEqual(partialDraft.preferredCastes, []);
  assert.deepEqual(partialDraft.preferredCountriesAbroad, []);
  assert.throws(() => validateAndSanitizeStep4({
    ...expectedPreferences,
    preferredWorkingLocation: 'Any',
  }));

  console.log('Step 4 preference persistence, conditional data, and payment-date permissions passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
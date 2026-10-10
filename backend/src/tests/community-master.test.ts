import * as assert from 'node:assert/strict';
import { CommunityMasterLevel, LocationLevel } from '@prisma/client';
import { CommunityService } from '../community/community.service';
import { validateAndSanitizeStep1Community } from '../community/community-profile.validation';
import { ProfilesService } from '../profiles/profiles.service';
import { validateStep1Address } from '../locations/location-address.validation';

const communityOptions = [
  { id: 'religion-hindu', name: 'Hindu', level: CommunityMasterLevel.RELIGION, parentId: null, isActive: true },
  { id: 'religion-christian', name: 'Christian', level: CommunityMasterLevel.RELIGION, parentId: null, isActive: true },
  { id: 'caste-arya', name: 'Arya Vysya', level: CommunityMasterLevel.CASTE, parentId: 'religion-hindu', isActive: true },
  { id: 'caste-hindu-other', name: 'Other Hindu Caste', level: CommunityMasterLevel.CASTE, parentId: 'religion-hindu', isActive: true },
  { id: 'caste-christian', name: 'Christian Caste', level: CommunityMasterLevel.CASTE, parentId: 'religion-christian', isActive: true },
  { id: 'subcaste-arya', name: 'Example Sub-Caste', level: CommunityMasterLevel.SUB_CASTE, parentId: 'caste-arya', isActive: true },
  { id: 'star-ashwini', name: 'Ashwini', level: CommunityMasterLevel.STAR, parentId: null, isActive: true },
  { id: 'moon-mesha', name: 'Mesha', level: CommunityMasterLevel.MOON_SIGN, parentId: null, isActive: true },
  { id: 'padam-1', name: '1', level: CommunityMasterLevel.PADAM, parentId: null, isActive: true },
  { id: 'gothram-test', name: 'Test Gothram', level: CommunityMasterLevel.GOTHRAM, parentId: null, isActive: true },
];

const locationOptions = [
  { id: 'country-in', name: 'India', level: LocationLevel.COUNTRY, parentId: null, isActive: true },
  { id: 'state-ap', name: 'Andhra Pradesh', level: LocationLevel.STATE, parentId: 'country-in', isActive: true },
];

const validStep1 = {
  country: 'India', countryId: 'country-in',
  state: 'Andhra Pradesh', stateId: 'state-ap',
  religion: 'Hindu', religionId: 'religion-hindu',
  caste: 'Arya Vysya', casteId: 'caste-arya',
};

async function main() {
  let query: any;
  const communityService = new CommunityService({
    communityMaster: {
      findFirst: async () => ({ id: 'religion-hindu', level: CommunityMasterLevel.RELIGION }),
      findMany: async (args: any) => {
        query = args.where;
        return communityOptions.filter((option) =>
          option.parentId === args.where.parentId && option.isActive && (!args.where.level || option.level === args.where.level),
        );
      },
    },
  } as any);
  const hinduCastes = await communityService.list('religion-hindu', CommunityMasterLevel.CASTE);
  assert.equal(query.parentId, 'religion-hindu');
  assert.deepEqual(hinduCastes.map((option) => option.name), ['Arya Vysya', 'Other Hindu Caste']);

  const religionFallbackService = new CommunityService({
    communityMaster: { findMany: async () => [] },
  } as any);
  const defaultReligions = await religionFallbackService.list(undefined, CommunityMasterLevel.RELIGION);
  assert.deepEqual(defaultReligions.map((option) => option.name), [
    'Hindu', 'Christian', 'Muslim', 'Caste Converted',
  ]);

  const createService = new CommunityService({
    communityMaster: {
      findFirst: async () => ({ id: 'caste-arya', level: CommunityMasterLevel.CASTE }),
    },
  } as any);
  await assert.rejects(
    createService.create({ name: 'Invalid child', level: CommunityMasterLevel.CASTE, parentId: 'caste-arya' }),
    /must belong to a religion/,
  );

  assert.throws(() => validateAndSanitizeStep1Community({ ...validStep1, religion: '' }, communityOptions), /Religion is required/);
  assert.throws(() => validateAndSanitizeStep1Community({ ...validStep1, caste: '' }, communityOptions), /Caste is required/);
  assert.throws(
    () => validateAndSanitizeStep1Community({ ...validStep1, religion: 'Christian', religionId: 'religion-christian' }, communityOptions),
    /Caste must belong to the selected religion/,
  );
  assert.throws(
    () => validateAndSanitizeStep1Community({ ...validStep1, caste: 'Other Hindu Caste', casteId: 'caste-hindu-other', subCaste: 'Example Sub-Caste', subCasteId: 'subcaste-arya' }, communityOptions),
    /Sub-caste must belong to the selected caste/,
  );

  const nonHindu = validateAndSanitizeStep1Community({
    ...validStep1,
    religion: 'Christian', religionId: 'religion-christian',
    caste: 'Christian Caste', casteId: 'caste-christian',
    casteConverted: false,
    star: 'Ashwini', starId: 'star-ashwini',
    moonSign: 'Mesha', moonSignId: 'moon-mesha',
    padam: '1', padamId: 'padam-1',
    gothram: 'Test Gothram', gothramId: 'gothram-test',
    kujaDosham: 'Yes', uncleGothram: 'Old value', swagothram: 'Old value',
  }, communityOptions);
  for (const field of ['star', 'starId', 'moonSign', 'moonSignId', 'padam', 'padamId', 'gothram', 'gothramId', 'kujaDosham', 'uncleGothram', 'swagothram']) {
    assert.equal(nonHindu[field], '', `${field} must be cleared for non-Hindu religion`);
  }
  assert.equal(nonHindu.casteConverted, false, 'Caste Converted remains available for every religion');

  const nonArya = validateAndSanitizeStep1Community({
    ...validStep1,
    caste: 'Other Hindu Caste', casteId: 'caste-hindu-other',
    star: 'Ashwini', starId: 'star-ashwini',
    uncleGothram: 'Old uncle value', swagothram: 'Old swa value',
  }, communityOptions);
  assert.equal(nonArya.star, 'Ashwini', 'Hindu values remain for Hindu castes');
  assert.equal(nonArya.uncleGothram, '');
  assert.equal(nonArya.swagothram, '');

  const arya = validateAndSanitizeStep1Community({
    ...validStep1,
    subCaste: 'Example Sub-Caste', subCasteId: 'subcaste-arya',
    star: 'Ashwini', starId: 'star-ashwini',
    kujaDosham: "Don't Know", uncleGothram: 'Uncle lineage', swagothram: 'Swa lineage',
    casteConverted: true,
  }, communityOptions);
  assert.equal(arya.uncleGothram, 'Uncle lineage');
  assert.equal(arya.swagothram, 'Swa lineage');
  assert.equal(arya.subCaste, 'Example Sub-Caste');
  assert.throws(() => validateAndSanitizeStep1Community({ ...validStep1, kujaDosham: 'Maybe' }, communityOptions), /Kuja Dosham/);

  let storedProfileData: Record<string, any> | undefined;
  const profilesService = new ProfilesService(
    {
      locationMaster: { findMany: async () => locationOptions },
      communityMaster: { findMany: async () => communityOptions },
      memberProfile: {
        findUnique: async () => ({
          id: 'profile-1', userId: 'member-1',
          profileData: { step2: { education: 'Prior value' } },
        }),
        update: async ({ data }: any) => {
          storedProfileData = data.profileData;
          return { id: 'profile-1', profileData: data.profileData };
        },
      },
    } as any,
    { log: async () => undefined } as any,
    { requireProfileOwnership: async () => undefined, requireOrganizationScope: async () => undefined } as any,
  );
  const result = await profilesService.updateProfile(
    { id: 'admin-1', role: 'ADMIN', organizationId: 'org-1' },
    'profile-1',
    { profileData: { step1: { ...validStep1, star: 'Ashwini', starId: 'star-ashwini' }, step2: { education: 'Updated value' } } } as any,
  );
  assert.equal(storedProfileData?.step1.religionId, 'religion-hindu');
  assert.equal(storedProfileData?.step1.star, 'Ashwini');
  assert.equal(storedProfileData?.step2.education, 'Updated value');
  assert.deepEqual(result.profileData, storedProfileData, 'updated profile returns saved values for edit-form reload');

  console.log('Community tests passed: religion filtering, hierarchy validation, conditional cleanup, and profile persistence.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
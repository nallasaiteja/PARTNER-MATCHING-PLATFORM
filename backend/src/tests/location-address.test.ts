import * as assert from 'node:assert/strict';
import { CommunityMasterLevel, LocationLevel } from '@prisma/client';
import { LocationsService } from '../locations/locations.service';
import { validateStep1Address } from '../locations/location-address.validation';
import { ProfilesService } from '../profiles/profiles.service';

const masterLocations = [
  { id: 'country-in', name: 'India', level: LocationLevel.COUNTRY, parentId: null, isActive: true },
  { id: 'state-ap', name: 'Andhra Pradesh', level: LocationLevel.STATE, parentId: 'country-in', isActive: true },
  { id: 'district-gnt', name: 'Guntur', level: LocationLevel.DISTRICT, parentId: 'state-ap', isActive: true },
  { id: 'mandal-tenali', name: 'Tenali', level: LocationLevel.MANDAL, parentId: 'district-gnt', isActive: true },
  { id: 'village-xyz', name: 'Sample Village', level: LocationLevel.VILLAGE, parentId: 'mandal-tenali', isActive: true },
];

async function main() {
  let queriedParentId: string | null | undefined;
  const locationsService = new LocationsService({
    locationMaster: {
      findFirst: async () => ({ id: 'state-ap', level: LocationLevel.STATE }),
      findMany: async ({ where }: any) => {
        queriedParentId = where.parentId;
        return masterLocations.filter((location) => location.parentId === where.parentId && location.isActive);
      },
    },
  } as any);

  const mandalOptions = await locationsService.list('district-gnt');
  assert.equal(queriedParentId, 'district-gnt');
  assert.deepEqual(mandalOptions.map((item) => item.name), ['Tenali']);

  const address = {
    country: 'India',
    countryId: 'country-in',
    state: 'Andhra Pradesh',
    stateId: 'state-ap',
    district: 'Guntur',
    districtId: 'district-gnt',
    mandal: 'Tenali',
    mandalId: 'mandal-tenali',
    village: 'Sample Village',
    villageId: 'village-xyz',
    religion: 'Hindu',
    religionId: 'religion-hindu',
    caste: 'Test Caste',
    casteId: 'caste-test',
  };
  assert.doesNotThrow(() => validateStep1Address(address, masterLocations));
  assert.throws(
    () => validateStep1Address({ ...address, stateId: 'state-other' }, masterLocations),
    /State must belong to the selected country/,
  );
  assert.throws(
    () => validateStep1Address({ ...address, mandal: 'Tenali', district: '' }, masterLocations),
    /Select a district before selecting a mandal/,
  );

  let persistedProfileData: Record<string, any> | undefined;
  const profilesService = new ProfilesService(
    {
      locationMaster: { findMany: async () => masterLocations },
      communityMaster: {
        findMany: async () => [
          { id: 'religion-hindu', name: 'Hindu', level: CommunityMasterLevel.RELIGION, parentId: null, isActive: true },
          { id: 'caste-test', name: 'Test Caste', level: CommunityMasterLevel.CASTE, parentId: 'religion-hindu', isActive: true },
        ],
      },
      memberProfile: {
        findUnique: async () => ({
          id: 'profile-1',
          userId: 'member-1',
          profileData: { step2: { education: 'Existing value' } },
        }),
        update: async ({ data }: any) => {
          persistedProfileData = data.profileData;
          return { id: 'profile-1', profileData: data.profileData };
        },
      },
    } as any,
    { log: async () => undefined } as any,
    {
      requireProfileOwnership: async () => undefined,
      requireOrganizationScope: async () => undefined,
    } as any,
  );

  const saved = await profilesService.updateProfile(
    { id: 'staff-1', role: 'ADMIN', organizationId: 'org-1' },
    'profile-1',
    { profileData: { step1: address, step2: { education: 'Updated value' } } } as any,
  );

  for (const [field, value] of Object.entries(address)) {
    assert.equal(persistedProfileData?.step1[field], value);
  }
  assert.equal(persistedProfileData?.step2.education, 'Updated value');
  assert.deepEqual(saved.profileData, persistedProfileData);

  console.log('Location address tests passed: dependent lookup, hierarchy validation, and profile persistence.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
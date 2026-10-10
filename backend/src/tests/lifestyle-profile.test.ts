import * as assert from 'node:assert/strict';
import {
  validateAndSanitizeStep1Lifestyle,
  VALID_MOTHER_TONGUES,
  VALID_COMPLEXIONS,
  VALID_MARITAL_STATUSES,
  VALID_FOOD_PREFERENCES,
  VALID_BLOOD_GROUPS,
} from '../profiles/lifestyle-profile.validation';
import { ProfilesService } from '../profiles/profiles.service';

async function main() {
  console.log('Running Step 1 Physical & Lifestyle backend tests...');

  // 1. Valid payload sanitization
  const validPayload = {
    height: `5'7" (170 cm)`,
    maritalStatus: 'Unmarried',
    motherTongue: 'Telugu',
    complexion: 'Fair',
    foodPreference: 'Vegetarian',
    bloodGroup: 'B+',
    smoke: false,
    drink: false,
    healthCondition: 'Normal / Healthy',
    aboutMe: 'Working professional looking for an educated partner.',
    hobbies: 'Reading, Traveling',
    spokenLanguages: ['Telugu', 'English'],
  };

  const sanitized = validateAndSanitizeStep1Lifestyle(validPayload);
  assert.equal(sanitized.height, `5'7" (170 cm)`);
  assert.equal(sanitized.maritalStatus, 'Unmarried');
  assert.equal(sanitized.motherTongue, 'Telugu');
  assert.equal(sanitized.complexion, 'Fair');
  assert.equal(sanitized.foodPreference, 'Vegetarian');
  assert.equal(sanitized.bloodGroup, 'B+');
  assert.equal(sanitized.smoke, false);
  assert.equal(sanitized.drink, false);
  assert.equal(sanitized.healthCondition, 'Normal / Healthy');
  assert.deepEqual(sanitized.spokenLanguages, ['Telugu', 'English']);

  // 2. Unmarried clears marital history fields
  const unmarriedWithHistory = {
    ...validPayload,
    maritalStatus: 'Unmarried',
    dateOfMarriage: '2020-01-01',
    divorceReason: 'Mutual',
    havingChildren: true,
    sons: [{ name: 'Son 1', age: 5 }],
  };
  const sanitizedUnmarried = validateAndSanitizeStep1Lifestyle(unmarriedWithHistory);
  assert.equal(sanitizedUnmarried.dateOfMarriage, '');
  assert.equal(sanitizedUnmarried.divorceReason, '');
  assert.equal(sanitizedUnmarried.havingChildren, false);
  assert.deepEqual(sanitizedUnmarried.sons, []);

  // 3. Widower / Divorced retains marital status
  const divorced = validateAndSanitizeStep1Lifestyle({
    ...validPayload,
    maritalStatus: 'Divorced',
  });
  assert.equal(divorced.maritalStatus, 'Divorced');

  // 4. Invalid marital status throws BadRequestException
  assert.throws(
    () => validateAndSanitizeStep1Lifestyle({ ...validPayload, maritalStatus: 'Single' }),
    /Marital status must be one of/,
  );

  // 5. Invalid mother tongue throws BadRequestException
  assert.throws(
    () => validateAndSanitizeStep1Lifestyle({ ...validPayload, motherTongue: 'Spanish' }),
    /Mother tongue must be one of/,
  );

  // 6. Invalid complexion throws BadRequestException
  assert.throws(
    () => validateAndSanitizeStep1Lifestyle({ ...validPayload, complexion: 'Wheatish' }),
    /Complexion must be one of/,
  );

  // 7. Invalid food preference throws BadRequestException
  assert.throws(
    () => validateAndSanitizeStep1Lifestyle({ ...validPayload, foodPreference: 'Pescatarian' }),
    /Food preference must be one of/,
  );

  // 8. Invalid blood group throws BadRequestException
  assert.throws(
    () => validateAndSanitizeStep1Lifestyle({ ...validPayload, bloodGroup: 'C+' }),
    /Blood group must be one of/,
  );

  // 9. End-to-end ProfilesService updateProfile persistence
  let storedProfileData: Record<string, any> | undefined;
  const profilesService = new ProfilesService(
    {
      locationMaster: { findMany: async () => [{ id: 'country-in', name: 'India', level: 'COUNTRY', parentId: null, isActive: true }, { id: 'state-ap', name: 'Andhra Pradesh', level: 'STATE', parentId: 'country-in', isActive: true }] },
      communityMaster: { findMany: async () => [{ id: 'religion-hindu', name: 'Hindu', level: 'RELIGION', parentId: null, isActive: true }, { id: 'caste-arya', name: 'Arya Vysya', level: 'CASTE', parentId: 'religion-hindu', isActive: true }] },
      memberProfile: {
        findUnique: async () => ({
          id: 'profile-lifestyle-1',
          userId: 'member-1',
          profileData: {},
        }),
        update: async ({ data }: any) => {
          storedProfileData = data.profileData;
          return { id: 'profile-lifestyle-1', profileData: data.profileData };
        },
      },
    } as any,
    { log: async () => undefined } as any,
    { requireProfileOwnership: async () => undefined, requireOrganizationScope: async () => undefined } as any,
  );

  const updateResult = await profilesService.updateProfile(
    { id: 'admin-1', role: 'ADMIN', organizationId: 'org-1' },
    'profile-lifestyle-1',
    {
      profileData: {
        step1: {
          country: 'India', countryId: 'country-in',
          state: 'Andhra Pradesh', stateId: 'state-ap',
          religion: 'Hindu', religionId: 'religion-hindu',
          caste: 'Arya Vysya', casteId: 'caste-arya',
          ...validPayload,
        },
      },
    } as any,
  );

  assert.equal(storedProfileData?.step1.height, `5'7" (170 cm)`);
  assert.equal(storedProfileData?.step1.maritalStatus, 'Unmarried');
  assert.equal(storedProfileData?.step1.motherTongue, 'Telugu');
  assert.equal(storedProfileData?.step1.complexion, 'Fair');
  assert.equal(storedProfileData?.step1.foodPreference, 'Vegetarian');
  assert.equal(storedProfileData?.step1.bloodGroup, 'B+');
  assert.deepEqual(storedProfileData?.step1.spokenLanguages, ['Telugu', 'English']);
  assert.deepEqual(updateResult.profileData, storedProfileData);

  // 10. Divorced with children & contact metadata persistence
  const divorcedPayload = {
    ...validPayload,
    maritalStatus: 'Divorced',
    dateOfMarriage: '2015-05-10',
    dateOfDivorce: '2021-08-15',
    divorceReason: 'Mutual Consent',
    divorceCertificateUrl: 'http://localhost/divorce.pdf',
    havingChildren: true,
    sons: [{ name: 'Karthik', age: 19, maritalStatus: 'Unmarried' }],
    daughters: [{ name: 'Ananya', age: 10 }],
    currentCountry: 'India',
    currentState: 'Telangana',
    currentDistrict: 'Hyderabad',
    currentCity: 'Hyderabad',
    currentVillage: 'Madhapur',
    currentAddress: 'Flat 402, Sunshine Heights',
    alternateMobile: '+919988776655',
    alternateEmail: 'karthik.parent@example.com',
    bestTimeToCall: 'Evening (4 PM - 8 PM)',
    applicationFor: 'Son',
    fillerName: 'Srinivas K',
    fillerMobile: '+919876543210',
    fillerRelation: 'Father',
    source: 'Online Search / Google',
    nearestBranch: 'Hyderabad HQ',
  };

  const divorcedResult = await profilesService.updateProfile(
    { id: 'admin-1', role: 'ADMIN', organizationId: 'org-1' },
    'profile-lifestyle-1',
    {
      profileData: {
        step1: {
          country: 'India', countryId: 'country-in',
          state: 'Andhra Pradesh', stateId: 'state-ap',
          religion: 'Hindu', religionId: 'religion-hindu',
          caste: 'Arya Vysya', casteId: 'caste-arya',
          ...divorcedPayload,
        },
      },
    } as any,
  );

  assert.equal(storedProfileData?.step1.maritalStatus, 'Divorced');
  assert.equal(storedProfileData?.step1.dateOfMarriage, '2015-05-10');
  assert.equal(storedProfileData?.step1.dateOfDivorce, '2021-08-15');
  assert.equal(storedProfileData?.step1.havingChildren, true);
  assert.equal(storedProfileData?.step1.sons.length, 1);
  assert.equal(storedProfileData?.step1.sons[0].name, 'Karthik');
  assert.equal(storedProfileData?.step1.daughters.length, 1);
  assert.equal(storedProfileData?.step1.currentCity, 'Hyderabad');
  assert.equal(storedProfileData?.step1.applicationFor, 'Son');
  assert.equal(storedProfileData?.step1.fillerName, 'Srinivas K');
  assert.deepEqual(divorcedResult.profileData, storedProfileData);

  console.log('✅ Physical, Lifestyle, Marital History, Address & Meta validation & persistence tests passed successfully!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

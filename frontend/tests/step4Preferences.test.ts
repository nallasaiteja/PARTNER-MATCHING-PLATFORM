import test from 'node:test';
import assert from 'node:assert/strict';

import type { Step4Data } from '../src/types/profile.ts';
import { validateStep4 } from '../src/utils/stepValidation.ts';

const validPreferences: Step4Data = {
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
};

test('Step 4 accepts and preserves multi-select fields and both ranges', () => {
  assert.deepEqual(validateStep4(validPreferences), {});

  const restored = JSON.parse(JSON.stringify(validPreferences)) as Step4Data;
  assert.deepEqual(restored, validPreferences);
});

test('Step 4 rejects invalid age and height range ordering', () => {
  const errors = validateStep4({
    ...validPreferences,
    ageRangeMin: 36,
    ageRangeMax: 30,
    heightRangeMin: `6'2"`,
    heightRangeMax: `5'8"`,
  });

  assert.ok(errors.ageRange);
  assert.ok(errors.heightRange);
});

test('Step 4 requires caste selections when inter-caste marriage is enabled', () => {
  const errors = validateStep4({ ...validPreferences, preferredCastes: [] });
  assert.ok(errors.preferredCastes);
});

test('Step 4 requires country selections for an abroad preference', () => {
  const errors = validateStep4({ ...validPreferences, preferredCountriesAbroad: [] });
  assert.ok(errors.preferredCountriesAbroad);
});